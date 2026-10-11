# API reference

Base URL: `http://localhost:5000/api`

Authenticated routes need the header `Authorization: Bearer <token>` (from `/auth/login`).
Camera box routes need `x-device-key: <key>` instead.
Files and photos are sent as base64 data URLs inside JSON (`"data:application/pdf;base64,..."`), 10 MB max.
Errors always look like `{ "message": "..." }` (in French, ready to display).

## Auth

| Method | Route | Who | Description |
|---|---|---|---|
| POST | `/auth/login` | anyone | `{ email, password }` → `{ token, user }`. Account must be `active`. |
| GET | `/auth/me` | logged in | Current user with student / teacher profile |
| PUT | `/auth/password` | logged in | `{ current_password, new_password }` |
| GET | `/auth/face` | student, teacher | `{ available, photos, needed, can_add }` — is my face registered? |
| POST | `/auth/face` | student, teacher | `{ image }` — register my own face, up to 3 photos, once (then only the admin can reset it) |

## Timetable

| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/schedules/my` | student, teacher | Own weekly classes, each with `Course`, `Classroom`, `Group`, `Teacher.User` and `notes` |
| GET | `/schedules?group_id=&teacher_id=&classroom_id=` | admin | All classes |
| POST | `/schedules` | admin | `{ group_id, course_id, teacher_id, classroom_id, day, start_time, end_time }` — `day` is `Monday`…`Sunday`; refused (409) on clashes |
| PUT | `/schedules/:id` | admin | Same fields, partial |
| DELETE | `/schedules/:id` | admin | Also deletes its attendance history |

## Notes

| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/notes?course_id=` | all | Student: their group's notes. Teacher: their own. Admin: all |
| POST | `/notes` | teacher | `{ course_id, group_id, title, message?, deadline?, file?: { name, data } }` — only for a subject the teacher teaches to that group |
| PUT | `/notes/:id` | author, admin | Any of `title, message, deadline, file, remove_file` |
| DELETE | `/notes/:id` | author, admin | |
| GET | `/notes/:id/file` | author, admin, students of the group | Downloads the attached file |

## Attendance

| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/attendance/device/status` | camera box | The box's classroom and the class happening now |
| POST | `/attendance/device/scan` | camera box | `{ image }` → recognizes the person and marks them present → `{ recognized, name, message, confidence }` |
| GET | `/attendance/session?schedule_id=&date=` | teacher (own class), admin | Everyone expected in that class with `present` / `absent` / `pending` |
| PUT | `/attendance/session/mark` | teacher, admin | `{ schedule_id, date, user_id, status }` — manual correction (only admin can change a teacher's status) |
| GET | `/attendance/my` | student, teacher | Own history |
| GET | `/attendance?role=&status=&group_id=&from=&to=&limit=` | admin | All records with filters |
| POST | `/attendance/finalize` | admin | `{ date? }` — record absences now for classes that have ended (also runs automatically every minute) |

## Dashboards

| Method | Route | Who |
|---|---|---|
| GET | `/dashboard/student` | student — attendance rate, absences per subject, today's classes, upcoming deadlines |
| GET | `/dashboard/teacher` | teacher — classes, today, students' and own attendance |
| GET | `/dashboard/admin` | admin — classes happening now, counts, student and teacher presence (total and today), last 7 days, most absent students |
| GET | `/dashboard/live` | admin — classes happening now with students present / expected and whether the teacher is there |

## Administration (admin only)

| Method | Route | Description |
|---|---|---|
| GET | `/admin/users?role=&status=&group_id=` | Users with profiles |
| POST | `/admin/users` | `{ name, email, password, role, status?, student_number, group_id }` (students) or `{ ..., speciality, department }` (teachers) |
| PUT | `/admin/users/:id` | Edit; `password` only if changing; `status: "active"` activates the account |
| DELETE | `/admin/users/:id` | Refused for a teacher who still has classes |
| GET | `/admin/faces` | `{ user_id: number_of_photos }` |
| POST | `/admin/users/:id/face` | `{ image }` — register a face photo |
| DELETE | `/admin/users/:id/face` | Forget the person's face |
| GET POST PUT DELETE | `/admin/groups`, `/admin/courses`, `/admin/classrooms`, `/admin/devices` | CRUD. Deleting something still in use is refused (409) |
| POST | `/admin/devices/:id/regenerate-key` | New secret key for a camera box |

## AI service (internal, port 8000)

Called only by the backend, with header `x-api-key`. It stores nothing.

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Status, models loaded |
| POST | `/embed` | `{ image, mode }` → `{ signature, faces_detected }`. `mode: "enroll"` requires exactly one clear face; `mode: "detect"` uses the biggest face (or `signature: null`) |
