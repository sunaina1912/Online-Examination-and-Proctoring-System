# ProctorX — AI-Powered Online Exam Proctoring System

> Next.js 14 · Tailwind · MongoDB · NextAuth · Mock AI (swap-ready)

---

## Stack

| Layer      | Tech                                      |
|------------|-------------------------------------------|
| Frontend   | Next.js 14 App Router, Tailwind CSS       |
| Auth       | NextAuth v4 (Credentials + JWT)           |
| Database   | MongoDB via Mongoose                      |
| AI (mock)  | Browser APIs + simulated events           |
| Camera     | WebRTC (getUserMedia)                     |
| Charts     | Recharts (reports page)                   |

---

## Quick Start (5 commands)

```bash
# 1. Install deps
npm install

# 1.5 Download local face models (required for stable multi-face detection)
npm run setup:face-models

# 1.6 Install Python AI service deps
python -m pip install -r python/requirements.txt
# (includes tensorflow + tf-keras for DeepFace compatibility)

# 2. Configure environment
cp .env.local.example .env.local
# Edit MONGODB_URI and NEXTAUTH_SECRET

# 3. Seed database (creates users + sample exam)
npx tsx scripts/seed.ts

# 4. Start dev server
npm run dev

# 4.1 Start Python proctoring service (separate terminal)
npm run proctoring:python

# If Python service was already running, restart it after dependency/model updates

# 5. Open
open http://localhost:3000
```

---

## Docker Compose Setup

Use this when the laptop has broken local Python or TensorFlow/MediaPipe installs and you want a cleaner setup.

```bash
# 1. Create Docker env file
cp .env.docker.example .env.docker

# 2. Set a real NEXTAUTH_SECRET in .env.docker

# 3. Build and start everything
docker compose up --build -d

# 4. Seed sample users + exam
docker compose --profile seed run --rm seed

# 5. Open the app
open http://localhost:3000
```

Services started by Compose:
- `web` on `http://localhost:3000`
- `python-ai` on `http://localhost:8001`
- `mongo` on `mongodb://localhost:27017`

Inside Docker, the app automatically uses:
- `MONGODB_URI=mongodb://mongo:27017/proctorx`
- `PYTHON_PROCTORING_URL=http://python-ai:8001`

Useful commands:

```bash
docker compose logs -f web
docker compose logs -f python-ai
docker compose down
```

If the Python AI still shows `degraded` inside Docker, check:

```bash
docker compose logs -f python-ai
curl http://localhost:8001/health
```

---

## Default Credentials (after seed)

| Role     | Email                    | Password   |
|----------|--------------------------|------------|
| Admin    | admin@proctorx.dev       | admin123   |
| Examiner | examiner@proctorx.dev    | exam123    |
| Student  | student@proctorx.dev     | student123 |

---

## Features

### Auth
- [x] Credentials login/register
- [x] Role-based: `admin` / `examiner` / `student`
- [x] JWT sessions via NextAuth
- [x] Middleware route protection

### Admin / Examiner
- [x] Dashboard with live stats (exams, students, submissions, flagged)
- [x] Exam CRUD — create, edit, delete, toggle active
- [x] Question builder — MCQ (4 options, correct answer) + Descriptive
- [x] Randomize questions toggle, negative marking toggle
- [x] Reports table — score, pass/fail, risk score, violations
- [x] Submission detail — full proctoring event timeline + answer review

### Student
- [x] Dashboard shows active exams + past results
- [x] Consent screen before starting (webcam / proctoring notice)
- [x] Timed exam interface with live countdown
- [x] Question navigator with answered/unanswered indicators
- [x] Auto-submit on timer expiry
- [x] Result screen with score, percentage, risk score

### AI Proctoring (Mock → Real swap-ready)
- [x] **Tab/window switch** — real (Visibility API)
- [x] **Copy-paste block** — real (event.preventDefault)
- [x] **Context menu block** — real
- [x] **Live camera feed** — real (WebRTC)
- [x] Face missing detection — mock (replace with face-api.js)
- [x] Multiple faces — mock
- [x] Eye gaze tracking — mock (replace with MediaPipe FaceMesh)
- [x] Audio detection — mock (replace with AudioWorklet)
- [x] Mobile device detection — mock
- [x] Risk score computation — real (weighted event accumulator)
- [x] Auto-flag at risk ≥ 80 — real

---

## Upgrading Mock → Real AI

In `src/hooks/useProctoring.ts`, the `setInterval` blocks are clearly commented.
Replace them with:

```ts
// Face detection
import * as faceapi from 'face-api.js'
// Load models then:
const detections = await faceapi.detectAllFaces(videoRef.current)
if (detections.length === 0) logEvent({ type: 'face_missing', ... })
if (detections.length > 1)  logEvent({ type: 'multiple_faces', ... })

// Gaze tracking
import { FaceMesh } from '@mediapipe/face_mesh'
// Use landmarks[468] and [473] (iris) to compute gaze direction
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  Landing page
│   ├── auth/login/               Login
│   ├── auth/register/            Register
│   ├── admin/
│   │   ├── dashboard/            Stats + recent activity
│   │   ├── exams/                CRUD exam manager
│   │   └── reports/              Submissions + [id] detail
│   ├── exam/[id]/                Proctored exam interface
│   └── api/
│       ├── auth/[...nextauth]/   NextAuth handler
│       ├── auth/register/        Registration endpoint
│       ├── exams/                GET list, POST create
│       ├── exams/[id]/           GET, PATCH, DELETE
│       ├── submissions/          POST start/submit, GET list
│       ├── submissions/[id]/     GET detail
│       ├── proctoring/           POST log event
│       └── reports/              GET analytics
├── components/
│   ├── admin/AdminSidebar.tsx
│   ├── exam/QuestionCard.tsx
│   ├── exam/ExamTimer.tsx
│   └── proctoring/ProctoringOverlay.tsx
├── hooks/
│   ├── useProctoring.ts          All proctoring logic
│   └── useExamTimer.ts           Countdown timer
├── models/
│   ├── User.ts
│   ├── Exam.ts
│   └── Submission.ts
└── lib/
    ├── db.ts                     Mongoose connection
    ├── auth.ts                   NextAuth config
    └── utils.ts                  cn() helper
```

---

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/proctorx
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

---

## Roadmap (Post-MVP)

- [ ] Real face detection via face-api.js
- [ ] Real gaze tracking via MediaPipe
- [ ] Audio analysis via AudioWorklet + Web Audio API
- [ ] Google OAuth login
- [ ] WebSocket real-time admin monitoring dashboard
- [ ] Exam scheduling (start/end datetime)
- [ ] LMS integration (export grades)
- [ ] Blockchain certificate verification
- [ ] Plagiarism detection for descriptive answers
