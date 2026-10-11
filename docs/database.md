# Database

PostgreSQL. Tables are created by the backend on startup (Sequelize `sync`); `npm run seed` recreates them with demo data. The full SQL is in [`database/schema.sql`](../database/schema.sql).

```
users ─┬─ students ── groups ─┬─ schedules ─┬─ attendance
       │                      │             │
       └─ teachers ───────────┼─────────────┘
                              │
            courses ──────────┤
            classrooms ───────┘── devices
            notes (teacher + course + group)
```

| Table | Content |
|---|---|
| `users` | Every account: name, email (unique), bcrypt password, `role` (student / teacher / admin), `status` (pending / active) |
| `students` | Student profile: `user_id`, `group_id`, `student_number` (unique) |
| `teachers` | Teacher profile: `user_id`, speciality, department |
| `groups` | Class groups (e.g. 3CS-A): name, year, department |
| `courses` | Subjects (matières) |
| `classrooms` | Rooms: name, capacity, building |
| `schedules` | Weekly timetable. One row = one recurring class: group + course + teacher + classroom + day + start/end time |
| `attendance` | One row per person, class and date: `present` or `absent`, and the recognition `confidence` for camera check-ins |
| `notes` | Teacher notes for a course and a group: title, message, optional deadline and attached file |
| `devices` | Camera boxes: name, classroom, secret `api_key`, active, last seen |
| `face_signatures` | Registered faces: `user_id` + a 128-number signature per photo (max 5 per person, photos are not stored) |
| `note_files` | Content of the file attached to a note (`note_id` + binary data) |

## Rules

- Schedules belong to a **group**; every student of the group sees them.
- A teacher can only post notes for a (course, group) they teach.
- Attendance has no row until someone is detected or the class ends; after the class every expected person has exactly one row.
- Deleting a group, course or classroom that is still used is refused by the API; deleting a schedule deletes its attendance history; deleting a user deletes their profile and attendance.
