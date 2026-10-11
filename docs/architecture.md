# Architecture

```
┌───────────────┐      HTTPS / JSON       ┌──────────────────┐      SQL      ┌────────────┐
│ React frontend│ ──────────────────────▶ │  Express backend │ ────────────▶ │ PostgreSQL │
│  (browser)    │   JWT in Authorization  │  (Node.js)       │   Sequelize   └────────────┘
└───────────────┘                         │                  │
                                          │                  │   x-api-key   ┌──────────────────┐
┌───────────────┐   photo + device key    │                  │ ────────────▶ │  AI service      │
│ Door camera   │ ──────────────────────▶ │                  │               │  (Python/OpenCV) │
│ box (1/room)  │                         └──────────────────┘               └──────────────────┘
└───────────────┘
```

## Components

**Frontend (`frontend/`)** — React single-page app, one menu per role. It only talks to the backend. The token is kept in `localStorage`; an expired token logs the user out.

**Backend (`backend/`)** — the only component with access to the database. Responsibilities:
- authentication (bcrypt + JWT) and role checks on every route
- timetable, notes (attached files stored in the database), administration
- attendance rules (`src/services/attendance.js`):
  - *current class*: the class whose room matches the camera box, on today's weekday, between 15 min before the start and the end
  - *check-in*: only people expected in that class (group's students + teacher) can be matched
  - *absences*: a job runs every minute and creates an `absent` record for each expected person without a record once a class has ended (idempotent)

**AI service (`ai-service/app.py`)** — stateless: turns a photo into a face signature (128 numbers) with OpenCV:
- YuNet to detect faces and their landmarks
- SFace to align the face and compute its signature

The backend stores the signatures in the `face_signatures` table (max 5 per person) and compares them with cosine similarity; a match needs ≥ 0.40 (`FACE_MATCH_THRESHOLD`). Note attachments are stored in the `note_files` table. Nothing is kept on disk, so the app runs on hosting platforms with a temporary disk.

**Door camera box (`ai-service/door_box.py`)** — runs at the classroom door. Detects faces locally (so it only sends photos when someone is close), then sends the photo to the backend with its device key and shows the result on screen.

## Main flows

**Check-in at the door**
1. Box detects a close face → `POST /attendance/device/scan { image }` with `x-device-key`
2. Backend: device → classroom → current class → expected people
3. Backend → AI service `POST /embed { image }` → signature, compared with the signatures of the expected people
4. Match → attendance `present` with the confidence score → response shown on the box

**End of class**
Absence job → for each class that has ended today → expected people without record → `absent`.

**Teacher note**
Teacher picks a subject in their timetable → `POST /notes` (with optional file) → students of that group see it under the subject in their timetable, with a deadline countdown.

## Why these choices

- **Matching only the expected people** of the current class makes recognition faster and much less likely to confuse two students.
- **Absences are computed, not detected**: a camera can only see who is there.
- **Signatures instead of photos**: smaller, and the original photos are not kept (privacy).
- **OpenCV models** install with `pip install opencv-python` on Windows, macOS and Linux, with no compiler needed (unlike dlib).

## Limits and next steps

See [roadmap.md](roadmap.md).
