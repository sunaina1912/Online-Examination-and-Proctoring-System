import base64
import io
import json
import logging
import os
import time
import warnings
from functools import lru_cache
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

IMPORT_ERRORS: Dict[str, str] = {}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_MODEL_HOME = os.path.join(BASE_DIR, ".runtime")
os.makedirs(LOCAL_MODEL_HOME, exist_ok=True)
# Keep TensorFlow startup quieter and more deterministic before DeepFace imports it.
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("DEEPFACE_HOME", os.path.join(LOCAL_MODEL_HOME, "deepface"))
os.environ.setdefault("ULTRALYTICS_SETTINGS_DIR", os.path.join(LOCAL_MODEL_HOME, "ultralytics"))
os.environ.setdefault("YOLO_CONFIG_DIR", os.path.join(LOCAL_MODEL_HOME, "ultralytics"))
os.makedirs(os.environ["DEEPFACE_HOME"], exist_ok=True)
os.makedirs(os.environ["ULTRALYTICS_SETTINGS_DIR"], exist_ok=True)
warnings.filterwarnings(
    "ignore",
    message=r".*tf\.losses\.sparse_softmax_cross_entropy is deprecated.*",
)
logging.getLogger("tensorflow").setLevel(logging.ERROR)
logging.getLogger("absl").setLevel(logging.ERROR)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
LOGGER = logging.getLogger("proctoring_service")

try:
    import tensorflow as tf

    tf.get_logger().setLevel("ERROR")
    tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)
except Exception:
    tf = None

try:
    import mediapipe as mp
except Exception as error:  # pragma: no cover
    mp = None
    IMPORT_ERRORS["mediapipe"] = str(error)

try:
    import tf_keras  # noqa: F401
except Exception as error:  # pragma: no cover
    IMPORT_ERRORS["tf_keras"] = str(error)

try:
    from deepface import DeepFace
except Exception as error:  # pragma: no cover
    DeepFace = None
    IMPORT_ERRORS["deepface"] = str(error)

try:
    from ultralytics import YOLO
except Exception as error:  # pragma: no cover
    YOLO = None
    IMPORT_ERRORS["ultralytics"] = str(error)


class AnalyzeRequest(BaseModel):
    image_data_url: str
    baseline_embedding: Optional[List[float]] = None


class AnalyzeResponse(BaseModel):
    analysis_ok: bool
    faces_count: int
    identity_distance: Optional[float]
    gaze_offscreen_score: float
    mobile_detected: bool
    mobile_confidence: float
    embedding: Optional[List[float]]
    model_status: str
    latency_ms: int
    service_status: str
    errors: Dict[str, str]
    detector_details: Dict[str, Any]


class EventLogRequest(BaseModel):
    submissionId: str
    event: Optional[Dict[str, Any]] = None
    sessionMetrics: Optional[Dict[str, Any]] = None
    snapshot: Optional[Dict[str, Any]] = None
    recordingClip: Optional[Dict[str, Any]] = None
    forwardedAt: Optional[str] = None


app = FastAPI(title="Proctoring AI Service", version="1.1.0")

SERVICE_STATE: Dict[str, object] = {
    "status": "booting",
    "models": {
        "face_cascade": False,
        "deepface_facenet": False,
        "mediapipe": mp is not None,
        "yolo_phone": False,
    },
    "errors": dict(IMPORT_ERRORS),
    "warmed_at_ms": 0,
}


def decode_data_url(data_url: str) -> np.ndarray:
    if ";base64," not in data_url:
        raise ValueError("Invalid data url")
    _, encoded = data_url.split(";base64,", 1)
    data = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(data)).convert("RGB")
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def cosine_distance(left: List[float], right: List[float]) -> Optional[float]:
    if not left or not right or len(left) != len(right):
        return None
    left_vec = np.array(left, dtype=np.float32)
    right_vec = np.array(right, dtype=np.float32)
    denom = (np.linalg.norm(left_vec) * np.linalg.norm(right_vec)) + 1e-8
    similarity = float(np.dot(left_vec, right_vec) / denom)
    return float(1.0 - similarity)


@lru_cache(maxsize=1)
def get_face_cascade():
    return cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


@lru_cache(maxsize=1)
def get_phone_model():
    if YOLO is None:
        return None
    try:
        return YOLO("yolov8n.pt")
    except Exception as error:
        SERVICE_STATE["errors"]["yolo_phone"] = str(error)
        return None


@lru_cache(maxsize=1)
def get_face_mesh():
    if mp is None:
        return None
    try:
        return mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
    except Exception as error:
        SERVICE_STATE["errors"]["mediapipe_face_mesh"] = str(error)
        return None


@lru_cache(maxsize=1)
def get_face_detectors():
    if mp is None:
        return None, None
    try:
        short_range = mp.solutions.face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=0.3,
        )
        full_range = mp.solutions.face_detection.FaceDetection(
            model_selection=1,
            min_detection_confidence=0.25,
        )
        return short_range, full_range
    except Exception as error:
        SERVICE_STATE["errors"]["mediapipe_face_detection"] = str(error)
        return None, None


def resize_for_processing(image: np.ndarray, max_side: int) -> np.ndarray:
    height, width = image.shape[:2]
    longest_side = max(height, width)
    if longest_side <= max_side:
        return image
    scale = max_side / float(longest_side)
    resized_width = max(1, int(width * scale))
    resized_height = max(1, int(height * scale))
    return cv2.resize(image, (resized_width, resized_height), interpolation=cv2.INTER_AREA)


def estimate_gaze_offscreen_score(image: np.ndarray) -> float:
    if mp is None:
        return 0.0
    try:
        mesh = get_face_mesh()
        if mesh is None:
            return 0.0
        working_image = resize_for_processing(image, 640)
        rgb = cv2.cvtColor(working_image, cv2.COLOR_BGR2RGB)
        result = mesh.process(rgb)
        if not result.multi_face_landmarks:
            return 0.0

        lm = result.multi_face_landmarks[0].landmark
        left_iris = lm[468]
        right_iris = lm[473]
        nose = lm[1]
        eyes_center_x = (left_iris.x + right_iris.x) / 2.0
        deviation = abs(eyes_center_x - nose.x)
        return float(min(1.0, deviation * 8.0))
    except Exception:
        return 0.0


def detect_faces_count(image: np.ndarray) -> Dict[str, Any]:
    working_image = resize_for_processing(image, 960)
    gray = cv2.cvtColor(working_image, cv2.COLOR_BGR2GRAY)
    normalized_gray = cv2.equalizeHist(gray)
    faces = get_face_cascade().detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(32, 32))
    normalized_faces = get_face_cascade().detectMultiScale(
        normalized_gray,
        scaleFactor=1.08,
        minNeighbors=3,
        minSize=(28, 28),
    )
    cascade_count = max(int(len(faces)), int(len(normalized_faces)))
    height, width = gray.shape[:2]

    tile_counts: List[int] = []
    if width >= 120 and height >= 120:
        tile_w = max(160, int(width * 0.58))
        tile_h = max(160, int(height * 0.58))
        tile_origins = [
            (0, 0),
            (max(0, width - tile_w), 0),
            (0, max(0, height - tile_h)),
            (max(0, width - tile_w), max(0, height - tile_h)),
            (max(0, (width - tile_w) // 2), max(0, (height - tile_h) // 2)),
        ]
        for origin_x, origin_y in tile_origins:
            tile_gray = gray[origin_y:origin_y + tile_h, origin_x:origin_x + tile_w]
            if tile_gray.size == 0:
                continue
            tile_eq = cv2.equalizeHist(tile_gray)
            tile_faces = get_face_cascade().detectMultiScale(
                tile_gray,
                scaleFactor=1.08,
                minNeighbors=3,
                minSize=(24, 24),
            )
            tile_faces_eq = get_face_cascade().detectMultiScale(
                tile_eq,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(22, 22),
            )
            tile_counts.append(max(int(len(tile_faces)), int(len(tile_faces_eq))))

    tile_face_count = max(tile_counts) if tile_counts else 0

    mediapipe_count = 0
    if mp is not None:
        try:
            rgb = cv2.cvtColor(working_image, cv2.COLOR_BGR2RGB)
            short_range, full_range = get_face_detectors()
            if short_range is not None:
                short_result = short_range.process(rgb)
                short_count = len(short_result.detections) if short_result.detections else 0
                mediapipe_count = max(mediapipe_count, short_count)
            if full_range is not None:
                full_result = full_range.process(rgb)
                full_count = len(full_result.detections) if full_result.detections else 0
                mediapipe_count = max(mediapipe_count, full_count)
        except Exception as error:
            SERVICE_STATE["errors"]["mediapipe_face_detection"] = str(error)

    best_count = max(cascade_count, mediapipe_count, tile_face_count)
    detector_used = "hybrid_face_count_tiled"
    return {
        "count": best_count,
        "cascade_count": cascade_count,
        "mediapipe_count": mediapipe_count,
        "tile_face_count": tile_face_count,
        "detector": detector_used,
    }


def extract_embedding(image: np.ndarray) -> Optional[List[float]]:
    if DeepFace is None:
        return None
    try:
        working_image = resize_for_processing(image, 640)
        reps = DeepFace.represent(
            img_path=working_image,
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False,
        )
        if isinstance(reps, list) and reps:
            embedding = reps[0].get("embedding")
            if embedding:
                return [float(value) for value in embedding]
    except Exception as error:
        SERVICE_STATE["errors"]["deepface_facenet"] = str(error)
        return None
    return None


def detect_phone_occluder_heuristic(image: np.ndarray, faces_count: int) -> Dict[str, Any]:
    if faces_count < 1:
        return {"detected": False, "confidence": 0.0, "detector": "phone_occluder_heuristic"}

    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 60, 160)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best_confidence = 0.0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < width * height * 0.01 or area > width * height * 0.22:
            continue

        x, y, w, h = cv2.boundingRect(contour)
        if w <= 0 or h <= 0:
            continue

        aspect_ratio = w / float(h)
        if not (0.35 <= aspect_ratio <= 0.85):
            continue

        center_x = (x + (w / 2.0)) / max(width, 1)
        center_y = (y + (h / 2.0)) / max(height, 1)
        if not (0.2 <= center_x <= 0.8 and 0.18 <= center_y <= 0.85):
            continue

        roi = gray[y:y + h, x:x + w]
        if roi.size == 0:
            continue

        darkness = 1.0 - (float(np.mean(roi)) / 255.0)
        rectangularity = area / max((w * h), 1)
        size_score = min(1.0, area / (width * height * 0.07))
        confidence = (
            0.35 * max(0.0, min(1.0, darkness)) +
            0.25 * max(0.0, min(1.0, rectangularity)) +
            0.20 * max(0.0, min(1.0, size_score)) +
            0.20 * (1.0 - min(1.0, abs(center_x - 0.5) * 1.5))
        )
        best_confidence = max(best_confidence, confidence)

    return {
        "detected": best_confidence >= 0.45,
        "confidence": best_confidence,
        "detector": "phone_occluder_heuristic",
        "reason": "rectangular_occluder_near_face",
    }


def detect_mobile_phone(image: np.ndarray, faces_count: int) -> Dict[str, Any]:
    model = get_phone_model()
    heuristic_result = detect_phone_occluder_heuristic(image, faces_count)
    if model is None:
        return heuristic_result if heuristic_result.get("detected") else {
            "detected": False,
            "confidence": float(heuristic_result.get("confidence", 0.0)),
            "detector": "yolo_phone_unavailable",
            "reason": "yolo_unavailable",
        }

    try:
        working_image = resize_for_processing(image, 640)
        results = model.predict(source=working_image, conf=0.1, verbose=False)
        best_confidence = 0.0
        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            confidences = boxes.conf.tolist() if getattr(boxes, "conf", None) is not None else []
            for index, cls_id in enumerate(boxes.cls.tolist()):
                if int(cls_id) == 67:  # COCO class id for cell phone
                    confidence = float(confidences[index]) if index < len(confidences) else 0.0
                    best_confidence = max(best_confidence, confidence)
        if best_confidence > 0 or heuristic_result.get("detected"):
            if best_confidence >= float(heuristic_result.get("confidence", 0.0)):
                return {"detected": True, "confidence": best_confidence, "detector": "yolo_phone"}
            return heuristic_result
    except Exception as error:
        SERVICE_STATE["errors"]["yolo_phone_predict"] = str(error)
        return heuristic_result if heuristic_result.get("detected") else {
            "detected": False,
            "confidence": float(heuristic_result.get("confidence", 0.0)),
            "detector": "yolo_phone",
            "reason": "predict_error",
        }
    return heuristic_result if heuristic_result.get("detected") else {
        "detected": False,
        "confidence": float(heuristic_result.get("confidence", 0.0)),
        "detector": "yolo_phone",
    }


def service_status() -> str:
    models = SERVICE_STATE["models"]
    has_primary = bool(models.get("face_cascade")) and bool(models.get("deepface_facenet"))
    if has_primary:
        return "healthy"
    has_partial = bool(models.get("face_cascade")) or bool(models.get("yolo_phone")) or bool(models.get("mediapipe"))
    return "degraded" if has_partial else "unavailable"


def model_status_string() -> str:
    models = SERVICE_STATE["models"]
    ready = [name for name, ok in models.items() if ok]
    return ",".join(ready) if ready else "none"


def warmup() -> None:
    try:
        cascade = get_face_cascade()
        SERVICE_STATE["models"]["face_cascade"] = not cascade.empty()
        if cascade.empty():
            SERVICE_STATE["errors"]["face_cascade"] = "opencv cascade failed to load"
    except Exception as error:
        SERVICE_STATE["errors"]["face_cascade"] = str(error)

    dummy = np.zeros((160, 160, 3), dtype=np.uint8)
    embedding = extract_embedding(dummy)
    SERVICE_STATE["models"]["deepface_facenet"] = embedding is not None

    model = get_phone_model()
    SERVICE_STATE["models"]["yolo_phone"] = model is not None
    SERVICE_STATE["models"]["mediapipe"] = mp is not None
    SERVICE_STATE["status"] = service_status()
    SERVICE_STATE["warmed_at_ms"] = int(time.time() * 1000)


@app.on_event("startup")
def on_startup() -> None:
    warmup()


@app.get("/health")
def health():
    return {
        "status": SERVICE_STATE["status"],
        "service_status": service_status(),
        "model_status": model_status_string(),
        "models": SERVICE_STATE["models"],
        "errors": SERVICE_STATE["errors"],
        "warmed_at_ms": SERVICE_STATE["warmed_at_ms"],
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    started = time.time()
    LOGGER.info("analyze_request_received")
    try:
        image = decode_data_url(payload.image_data_url)
    except Exception as error:
        LOGGER.warning("analyze_request_invalid_payload %s", error)
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {error}")

    timings: Dict[str, int] = {}

    stage_started = time.time()
    face_result = detect_faces_count(image)
    timings["faces_ms"] = int((time.time() - stage_started) * 1000)
    faces_count = int(face_result.get("count", 0))

    stage_started = time.time()
    embedding = extract_embedding(image)
    timings["embedding_ms"] = int((time.time() - stage_started) * 1000)
    identity_distance = cosine_distance(payload.baseline_embedding or [], embedding or [])

    stage_started = time.time()
    gaze_score = estimate_gaze_offscreen_score(image)
    timings["gaze_ms"] = int((time.time() - stage_started) * 1000)

    stage_started = time.time()
    mobile_result = detect_mobile_phone(image, faces_count)
    timings["mobile_ms"] = int((time.time() - stage_started) * 1000)

    latency_ms = int((time.time() - started) * 1000)

    SERVICE_STATE["status"] = service_status()
    analysis_ok = True
    LOGGER.info(
        "analyze_request_complete %s",
        json.dumps(
            {
                "latency_ms": latency_ms,
                "faces_count": faces_count,
                "cascade_faces_count": int(face_result.get("cascade_count", 0)),
                "mediapipe_faces_count": int(face_result.get("mediapipe_count", 0)),
                "tile_faces_count": int(face_result.get("tile_face_count", 0)),
                "embedding_ready": embedding is not None,
                "gaze_score": gaze_score,
                "mobile_detected": bool(mobile_result.get("detected")),
                "mobile_confidence": float(mobile_result.get("confidence", 0.0)),
                "timings": timings,
            },
            ensure_ascii=True,
            separators=(",", ":"),
        ),
    )

    return AnalyzeResponse(
        analysis_ok=analysis_ok,
        faces_count=faces_count,
        identity_distance=identity_distance,
        gaze_offscreen_score=gaze_score,
        mobile_detected=bool(mobile_result.get("detected")),
        mobile_confidence=float(mobile_result.get("confidence", 0.0)),
        embedding=embedding,
        model_status=model_status_string(),
        latency_ms=latency_ms,
        service_status=SERVICE_STATE["status"],
        errors=SERVICE_STATE["errors"],
        detector_details={
            "face_detector": str(face_result.get("detector", "unknown")),
            "face_count_cascade": int(face_result.get("cascade_count", 0)),
            "face_count_mediapipe": int(face_result.get("mediapipe_count", 0)),
            "face_count_tiles": int(face_result.get("tile_face_count", 0)),
            "embedding_model": "Facenet512" if embedding else "unavailable",
            "gaze_detector": "mediapipe" if mp is not None else "unavailable",
            "mobile_detector": mobile_result.get("detector", "unknown"),
            "mobile_reason": mobile_result.get("reason"),
            "timings_ms": timings,
        },
    )


@app.post("/events")
def log_event(payload: EventLogRequest):
    LOGGER.info(
        "proctoring_event %s",
        json.dumps(
            payload.model_dump(mode="json"),
            ensure_ascii=True,
            separators=(",", ":"),
        ),
    )
    return {"ok": True}
