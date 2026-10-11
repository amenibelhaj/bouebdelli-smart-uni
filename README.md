# Bouebdelli Smart Uni

A university management platform where **attendance is taken automatically by face recognition** at the classroom door.

A camera box is mounted at the door of each classroom. When a student or teacher walks in, the box recognizes their face and the platform marks them present for the class happening in that room. When the class ends, everyone who did not show up is marked absent. Students, teachers and the administration each get their own space to follow timetables, notes and attendance.

## Features

**Students**
- Weekly timetable: each subject with its time, teacher, classroom and the teacher's notes
- Notes with deadlines (countdown) and downloadable documents (PDF, Word…)
- Attendance rate, absences per subject, full history

**Teachers**
- Their timetable as assigned by the administration
- Attendance sheet for each class: who came (with recognition score), who did not, live updates during class, manual corrections
- Notes under each subject for a group: announcements, deadlines, attached files

**Administration**
- Manage everything: students, teachers, admins (with account activation), groups, subjects, classrooms, camera boxes
- Build the timetable per group, with automatic clash detection (group, teacher or room already busy)
- Register face photos for recognition
- University-wide presence and absence for students and for teachers, last 7 days, most absent students, full history with filters

## How the face recognition works

```
 Door camera box ──photo──▶ Backend API ──▶ AI service ──▶ "this is Ameni, 92 %"
 (one per classroom)        finds the class    compares with the
                            in this room now   registered faces of
                            and marks present  that class only
```

1. The admin registers 2–3 photos of each person. The AI service turns each face into a 128-number signature (only signatures are stored, not photos).
2. The box (`ai-service/door_box.py`) watches the door. When a face is close, it sends a photo to the backend with its secret device key.
3. The backend knows which classroom the box is in, finds the class taking place there now (check-in opens 15 minutes before), and asks the AI service who it is, comparing only with the students of that group and the teacher.
4. A match marks the person present. Every minute, the backend marks absent everyone who missed a class that has ended.

For the demo the box runs on a laptop webcam; in production the same script runs on a small computer with a camera (e.g. Raspberry Pi) at each door.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, Vite |
| Backend | Node.js, Express 5, Sequelize, JWT, bcrypt |
| Database | PostgreSQL |
| AI service | Python, Flask, OpenCV (YuNet face detection + SFace face recognition) |

## Getting started

Requirements: **Node.js 18+**, **PostgreSQL**, **Python 3.10+**.

### 1. Database

Create an empty database (for example in pgAdmin or psql):

```sql
CREATE DATABASE bouebdelli_smart_uni;
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `backend/.env`: your PostgreSQL password, a long random `JWT_SECRET`, and an `AI_SERVICE_KEY` of your choice.

```bash
npm run seed    # creates the tables and demo data (deletes existing data!)
npm run dev     # API on http://localhost:5000
```

### 3. AI service

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python download_models.py        # downloads the 2 face models (~39 MB), once
cp .env.example .env             # Windows: copy .env.example .env
```

Put the same `AI_SERVICE_KEY` as in `backend/.env`, then:

```bash
python app.py                    # face service on http://localhost:8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

### Demo accounts

All demo accounts use the password `password123`.

| Role | Email |
|---|---|
| Admin | admin@smartuni.com |
| Teachers | ahmed@smartuni.com, sonia@smartuni.com, karim@smartuni.com |
| Students | ameni@smartuni.com (3CS-A), ines@smartuni.com (3CS-B), … |

### Try the face recognition

1. Log in as admin → **Utilisateurs** → *Visage* → add 2–3 clear photos of yourself on a student account (e.g. Ameni).
2. **Emploi du temps** → add a class for that student's group, today, starting now, in room **B6**.
3. Run the door box for room B6 (its key is on the **Boîtiers caméra** page):
   ```bash
   cd ai-service
   python door_box.py --key demo-key-b6
   ```
4. Look at the camera: the window shows *Bienvenue … — présence enregistrée*. Log in as the teacher → **Présences**: the student is present, with the recognition score.

No webcam? Send a photo instead: `python door_box.py --key demo-key-b6 --image photo.jpg`

## Project structure

```
backend/      Express API (routes, models, attendance rules, seed)
frontend/     React app (pages per role, timetable, attendance sheet)
ai-service/   Face recognition API (app.py) and door camera box (door_box.py)
database/     schema.sql — documentation of the tables
docs/         architecture, API, database, requirements, roadmap
```

## Security notes

- Passwords are hashed with bcrypt; sessions use JWT (1 day).
- Every route checks the user's role; teachers only see and edit their own classes and notes, students only their group's.
- Camera boxes authenticate with a per-box key; the AI service is only reachable by the backend (shared key).
- Never commit `.env` files. If a secret was ever pushed, change it.

## License

MIT
