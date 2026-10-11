# Roadmap

## Done

- [x] Database model: users, students, teachers, groups, courses, classrooms, timetable, attendance
- [x] Authentication (JWT) and role-based access
- [x] Timetable per group with clash detection
- [x] Teacher notes with deadlines and attached files
- [x] Face recognition service (OpenCV YuNet + SFace)
- [x] Door camera box program (webcam / Raspberry Pi)
- [x] Automatic check-in and automatic absences at the end of each class
- [x] Manual attendance corrections
- [x] Student, teacher and admin dashboards
- [x] Full administration (users, groups, subjects, rooms, camera boxes)
- [x] French React interface, responsive

## Next

- **Liveness detection** (anti-spoofing): today a printed photo of a student could be recognized. Add blink / head-movement detection or a depth camera.
- **Late arrivals**: a "late" status when the check-in happens after the start of the class.
- **Excused absences**: students upload a medical certificate, the admin validates it.
- **Notifications**: email or push when a deadline is close or after too many absences.
- **Holidays and exams calendar**: no absences on public holidays; one-off sessions.
- **Raspberry Pi deployment**: run `door_box.py` on boot, with a small screen and a green/red LED.
- **Tests**: automated API tests and CI on GitHub Actions.
- **Deployment**: Docker Compose for the 3 services + PostgreSQL, HTTPS.
