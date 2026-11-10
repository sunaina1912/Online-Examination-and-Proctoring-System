import base64
import io
import re
import shutil
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from pydantic import BaseModel

try:
    import mediapipe as mp
except Exception:  # pragma: no cover
    mp = None

try:
    from deepface import DeepFace
except Exception:  # pragma: no cover
    DeepFace = None

try:
    import pytesseract
except Exception:  # pragma: no cover
    pytesseract = None


class LicenseVerifyRequest(BaseModel):
    face_image_data_url: str
    license_image_data_url: str


class LicenseVerifyResponse(BaseModel):
    verification_status: str
    confidence: float
    face_match_distance: Optional[float]
    live_face_detected: bool
    license_face_detected: bool
    extracted_license_data: Dict[str, Optional[str]]
    raw_ocr_text: str
    liveness_score: float
    liveness_status: str
    module_outputs: Dict[str, Any]
    latency_ms: int


@dataclass
class DecodedAsset:
    image: np.ndarray
    width: int
    height: int
    format: str


def decode_data_url(data_url: str) -> DecodedAsset:
    if ";base64," not in data_url:
        raise ValueError("Invalid data URL payload")
    header, encoded = data_url.split(";base64,", 1)
    mime = header.split(":", 1)[-1] if ":" in header else "image/unknown"
    data = base64.b64decode(encoded)
    pil_image = Image.open(io.BytesIO(data)).convert("RGB")
    array = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    height, width = array.shape[:2]
    return DecodedAsset(image=array, width=width, height=height, format=mime)


def resize_preserving_aspect(image: np.ndarray, max_side: int = 1280) -> np.ndarray:
    height, width = image.shape[:2]
    longest_side = max(height, width)
    if longest_side <= max_side:
        return image
    scale = max_side / float(longest_side)
    return cv2.resize(
        image,
        (max(1, int(width * scale)), max(1, int(height * scale))),
        interpolation=cv2.INTER_AREA,
    )


def enhance_image(image: np.ndarray) -> np.ndarray:
    resized = resize_preserving_aspect(image, 1280)
    denoised = cv2.fastNlMeansDenoisingColored(resized, None, 6, 6, 7, 21)
    lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(l_channel)
    merged = cv2.merge((enhanced_l, a_channel, b_channel))
    normalized = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    return cv2.normalize(normalized, None, 0, 255, cv2.NORM_MINMAX)


def detect_face_boxes(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    boxes = cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(48, 48))
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in boxes]


def crop_largest_face(image: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[Tuple[int, int, int, int]]]:
    boxes = detect_face_boxes(image)
    if not boxes:
        return None, None
    x, y, w, h = max(boxes, key=lambda item: item[2] * item[3])
    pad_x = int(w * 0.18)
    pad_y = int(h * 0.22)
    start_x = max(0, x - pad_x)
    start_y = max(0, y - pad_y)
    end_x = min(image.shape[1], x + w + pad_x)
    end_y = min(image.shape[0], y + h + pad_y)
    return image[start_y:end_y, start_x:end_x], (start_x, start_y, end_x - start_x, end_y - start_y)


def locate_document_region(image: np.ndarray) -> Tuple[np.ndarray, Optional[Tuple[int, int, int, int]]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = gray.shape[:2]
    frame_area = height * width
    best_rect = None
    best_area = 0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < frame_area * 0.15:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = w / float(max(h, 1))
        if 1.2 <= aspect_ratio <= 2.4 and area > best_area:
            best_rect = (x, y, w, h)
            best_area = area
    if not best_rect:
        return image, None
    x, y, w, h = best_rect
    cropped = image[max(0, y - 8):min(image.shape[0], y + h + 8), max(0, x - 8):min(image.shape[1], x + w + 8)]
    return cropped, best_rect


def prepare_ocr_variants(image: np.ndarray) -> List[np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    adaptive = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )
    return [enhanced, binary, adaptive]


def extract_embeddings(image: np.ndarray) -> Optional[List[float]]:
    if DeepFace is None:
        return None
    try:
        reps = DeepFace.represent(
            img_path=resize_preserving_aspect(image, 640),
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False,
        )
        if isinstance(reps, list) and reps:
            embedding = reps[0].get("embedding")
            if embedding:
                return [float(value) for value in embedding]
    except Exception:
        return None
    return None


def cosine_distance(left: Optional[List[float]], right: Optional[List[float]]) -> Optional[float]:
    if not left or not right or len(left) != len(right):
        return None
    left_vec = np.array(left, dtype=np.float32)
    right_vec = np.array(right, dtype=np.float32)
    denom = (np.linalg.norm(left_vec) * np.linalg.norm(right_vec)) + 1e-8
    return float(1.0 - (np.dot(left_vec, right_vec) / denom))


def read_text_from_license(image: np.ndarray) -> Tuple[str, Dict[str, Any]]:
    if pytesseract is None or not shutil.which("tesseract"):
        return "", {
            "status": "degraded",
            "engine": "unavailable",
            "reason": "tesseract_not_installed",
        }

    best_text = ""
    best_len = 0
    for variant in prepare_ocr_variants(image):
        try:
            text = pytesseract.image_to_string(variant, config="--oem 3 --psm 6")
        except Exception:
            continue
        if len(text.strip()) > best_len:
            best_text = text
            best_len = len(text.strip())
    return best_text, {
        "status": "ok" if best_text.strip() else "review_required",
        "engine": "tesseract",
        "characters": len(best_text.strip()),
    }


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" :,-")


def extract_field_from_text(text: str, labels: List[str]) -> Optional[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        lower = line.lower()
        for label in labels:
            if label.lower() in lower:
                parts = re.split(label, line, flags=re.IGNORECASE, maxsplit=1)
                candidate = normalize_whitespace(parts[-1] if parts else line)
                if candidate and candidate.lower() != label.lower():
                    return candidate
    return None


def extract_dates(text: str) -> List[str]:
    patterns = [
        r"\b\d{2}[/-]\d{2}[/-]\d{4}\b",
        r"\b\d{4}[/-]\d{2}[/-]\d{2}\b",
        r"\b\d{2}\s+[A-Za-z]{3,9}\s+\d{4}\b",
    ]
    matches: List[str] = []
    for pattern in patterns:
        matches.extend(re.findall(pattern, text))
    unique_dates: List[str] = []
    for item in matches:
        if item not in unique_dates:
            unique_dates.append(item)
    return unique_dates


def extract_license_number(text: str) -> Optional[str]:
    labeled = extract_field_from_text(text, ["license no", "licence no", "dl no", "license number", "licence number"])
    if labeled:
        match = re.search(r"[A-Z0-9-]{6,}", labeled.upper())
        if match:
            return match.group(0)
    generic = re.search(r"\b[A-Z]{1,4}[ -]?\d{4,12}[A-Z0-9-]*\b", text.upper())
    return generic.group(0).replace(" ", "") if generic else None


def extract_name(text: str) -> Optional[str]:
    labeled = extract_field_from_text(text, ["name", "holder", "driver"])
    if labeled:
        return labeled
    lines = [normalize_whitespace(line) for line in text.splitlines() if line.strip()]
    candidates = [
        line for line in lines
        if re.fullmatch(r"[A-Za-z][A-Za-z .]{4,}", line)
        and "driving" not in line.lower()
        and "license" not in line.lower()
        and "licence" not in line.lower()
    ]
    return max(candidates, key=len) if candidates else None


def extract_address(text: str) -> Optional[str]:
    labeled = extract_field_from_text(text, ["address", "addr"])
    if labeled:
        return labeled
    lines = [normalize_whitespace(line) for line in text.splitlines() if line.strip()]
    candidates = [line for line in lines if any(char.isdigit() for char in line) and len(line) > 10]
    return max(candidates, key=len) if candidates else None


def parse_license_text(text: str) -> Dict[str, Optional[str]]:
    dates = extract_dates(text)
    return {
        "license_number": extract_license_number(text),
        "name": extract_name(text),
        "date_of_birth": extract_field_from_text(text, ["dob", "date of birth", "birth"]) or (dates[0] if dates else None),
        "address": extract_address(text),
        "validity": extract_field_from_text(text, ["valid till", "validity", "expiry", "expires"]) or (dates[-1] if len(dates) > 1 else None),
    }


def compute_ear(face_landmarks: Any, eye_indices: List[int]) -> Optional[float]:
    points = [face_landmarks[idx] for idx in eye_indices]
    if len(points) < 6:
        return None
    horizontal = np.hypot(points[0].x - points[3].x, points[0].y - points[3].y)
    vertical_1 = np.hypot(points[1].x - points[5].x, points[1].y - points[5].y)
    vertical_2 = np.hypot(points[2].x - points[4].x, points[2].y - points[4].y)
    if horizontal <= 1e-6:
        return None
    return float((vertical_1 + vertical_2) / (2.0 * horizontal))


def assess_liveness(face_image: np.ndarray) -> Dict[str, Any]:
    gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(np.mean(gray)) / 255.0
    texture = float(np.std(gray)) / 64.0
    texture_score = max(0.0, min(1.0, texture))
    blur_score = max(0.0, min(1.0, blur_var / 180.0))
    brightness_score = max(0.0, 1.0 - min(1.0, abs(brightness - 0.52) / 0.52))

    eye_score = 0.5
    face_mesh_status = "unavailable"
    if mp is not None:
        try:
            with mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
            ) as face_mesh:
                rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb)
                if results.multi_face_landmarks:
                    face_mesh_status = "ok"
                    landmarks = results.multi_face_landmarks[0].landmark
                    left_ear = compute_ear(landmarks, [33, 160, 158, 133, 153, 144])
                    right_ear = compute_ear(landmarks, [362, 385, 387, 263, 373, 380])
                    if left_ear is not None and right_ear is not None:
                        avg_ear = (left_ear + right_ear) / 2.0
                        symmetry_penalty = min(0.25, abs(left_ear - right_ear) * 4.0)
                        eye_score = max(0.0, min(1.0, (avg_ear / 0.32) - symmetry_penalty))
        except Exception:
            face_mesh_status = "error"

    final_score = float(
        max(
            0.0,
            min(
                1.0,
                (0.35 * blur_score) + (0.20 * brightness_score) + (0.20 * texture_score) + (0.25 * eye_score),
            ),
        )
    )
    if final_score >= 0.68:
        status = "live"
    elif final_score >= 0.45:
        status = "review_required"
    else:
        status = "spoof_suspected"

    return {
        "score": final_score,
        "status": status,
        "signals": {
            "blur_variance": round(blur_var, 2),
            "brightness": round(brightness, 3),
            "texture_score": round(texture_score, 3),
            "eye_score": round(eye_score, 3),
            "face_mesh": face_mesh_status,
        },
    }


def verify_license(face_image_data_url: str, license_image_data_url: str) -> LicenseVerifyResponse:
    started = time.time()

    live_asset = decode_data_url(face_image_data_url)
    license_asset = decode_data_url(license_image_data_url)

    input_module = {
        "status": "ok",
        "face_image": {
            "width": live_asset.width,
            "height": live_asset.height,
            "format": live_asset.format,
        },
        "license_image": {
            "width": license_asset.width,
            "height": license_asset.height,
            "format": license_asset.format,
        },
        "validation": {
            "face_resolution_ok": live_asset.width >= 240 and live_asset.height >= 240,
            "license_resolution_ok": license_asset.width >= 480 and license_asset.height >= 280,
        },
    }
    if not input_module["validation"]["face_resolution_ok"] or not input_module["validation"]["license_resolution_ok"]:
        input_module["status"] = "review_required"

    processed_live = enhance_image(live_asset.image)
    cropped_license, document_bounds = locate_document_region(license_asset.image)
    processed_license = enhance_image(cropped_license)
    live_face_crop, live_face_box = crop_largest_face(processed_live)
    license_face_crop, license_face_box = crop_largest_face(processed_license)

    preprocessing_module = {
        "status": "ok",
        "operations": [
            "resize",
            "noise_reduction",
            "contrast_enhancement",
            "normalization",
            "document_region_crop",
            "face_crop",
        ],
        "document_bounds": document_bounds,
        "live_face_box": live_face_box,
        "license_face_box": license_face_box,
    }

    live_embedding = extract_embeddings(live_face_crop if live_face_crop is not None else processed_live)
    license_embedding = extract_embeddings(license_face_crop if license_face_crop is not None else processed_license)
    distance = cosine_distance(live_embedding, license_embedding)
    if distance is None:
        face_status = "review_required"
        face_confidence = 0.0
    elif distance <= 0.38:
        face_status = "matched"
        face_confidence = max(0.0, min(1.0, 1.0 - distance))
    elif distance <= 0.52:
        face_status = "review_required"
        face_confidence = max(0.0, min(1.0, 0.8 - distance / 2.0))
    else:
        face_status = "mismatch"
        face_confidence = max(0.0, min(1.0, 1.0 - distance))

    face_recognition_module = {
        "status": "ok" if distance is not None else "degraded",
        "live_face_detected": live_face_crop is not None,
        "license_face_detected": license_face_crop is not None,
        "embedding_model": "Facenet512" if DeepFace is not None else "unavailable",
        "distance": distance,
        "match_status": face_status,
        "confidence": round(face_confidence, 3),
    }

    raw_text, ocr_runtime = read_text_from_license(processed_license)
    extracted_data = parse_license_text(raw_text)
    ocr_module = {
        "status": ocr_runtime["status"],
        "engine": ocr_runtime["engine"],
        "detected_fields": extracted_data,
        "characters": ocr_runtime.get("characters", 0),
        "reason": ocr_runtime.get("reason"),
    }

    liveness_reference = live_face_crop if live_face_crop is not None else processed_live
    liveness = assess_liveness(liveness_reference)
    liveness_module = {
        "status": "ok" if liveness["status"] != "spoof_suspected" else "review_required",
        "liveness_status": liveness["status"],
        "score": liveness["score"],
        "signals": liveness["signals"],
    }

    verification_status = "review_required"
    if face_status == "matched" and liveness["status"] == "live":
        verification_status = "verified"
    elif face_status == "mismatch" or liveness["status"] == "spoof_suspected":
        verification_status = "failed"

    confidence_components = [
        face_confidence,
        float(liveness["score"]),
        0.7 if any(extracted_data.values()) else 0.35,
        0.9 if input_module["status"] == "ok" else 0.55,
    ]
    confidence = float(round(sum(confidence_components) / len(confidence_components), 3))

    return LicenseVerifyResponse(
        verification_status=verification_status,
        confidence=confidence,
        face_match_distance=distance,
        live_face_detected=live_face_crop is not None,
        license_face_detected=license_face_crop is not None,
        extracted_license_data=extracted_data,
        raw_ocr_text=raw_text,
        liveness_score=float(liveness["score"]),
        liveness_status=str(liveness["status"]),
        module_outputs={
            "input_module": input_module,
            "preprocessing_module": preprocessing_module,
            "face_recognition_module": face_recognition_module,
            "ocr_module": ocr_module,
            "liveness_module": liveness_module,
        },
        latency_ms=int((time.time() - started) * 1000),
    )
