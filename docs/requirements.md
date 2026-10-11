# Requirements

## Goal

Manage a university's timetable and attendance, with attendance taken automatically by a camera at each classroom door.

## Users

**Student**
- Sees their weekly timetable: each subject with its time, the teacher who teaches it, the classroom, and the notes the teacher posted for it.
- Sees teachers' notes (announcements, deadlines, documents to download).
- Sees how many absences they have, per subject and in total.

**Teacher**
- Sees the timetable assigned to them by the administration.
- Sees who attended each of their classes and who did not; can correct a mistake.
- Posts notes under each subject for a group (e.g. "hand in the report as PDF before Friday"), with an optional deadline and attached document.

**Administration**
- Manages everything (create, read, update, delete): students, teachers, admins, groups, subjects, classrooms, camera boxes, timetable.
- Assigns timetables to groups (students) and teachers.
- Sees total university presence and absence for students, and for teachers.
- Activates new accounts and registers face photos.

## Attendance by face recognition

- One camera box at the door of each classroom.
- A person recognized at the door during a class (or up to 15 minutes before) is marked present for that class.
- Only people expected in that class can be recognized there.
- When the class ends, every expected person not seen is marked absent.
- Teachers and the admin can correct attendance manually.

## Non-functional

- Interface in French, usable on phone and computer.
- Passwords hashed, role-based access on every route, secrets in `.env` files only.
- Face photos are not stored, only face signatures.
