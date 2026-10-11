-- Bouebdelli Smart Uni — PostgreSQL schema
--
-- You do NOT need to run this file: the backend creates the tables itself
-- on startup (Sequelize sync), and `npm run seed` recreates them with demo data.
-- This file documents the structure (same tables, columns and constraints).

CREATE TYPE enum_users_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE enum_users_status AS ENUM ('pending', 'active');
CREATE TYPE enum_attendance_status AS ENUM ('present', 'absent');


-- Every account (students, teachers, admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,                  -- bcrypt hash
    role enum_users_role NOT NULL,
    status enum_users_status DEFAULT 'pending',      -- must be 'active' to log in
    "createdAt" TIMESTAMPTZ NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL
);


-- Class groups, e.g. 3CS-A
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL
);


CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
    student_number VARCHAR(255) NOT NULL UNIQUE
);


CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    speciality VARCHAR(255),
    department VARCHAR(255)
);


-- Subjects (matières)
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);


CREATE TABLE classrooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL,
    building VARCHAR(255)
);


-- Weekly timetable: one row = one recurring class
-- (group + subject + teacher + room, every <day> from start_time to end_time)
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON UPDATE CASCADE ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
    day VARCHAR(255) NOT NULL,                       -- 'Monday' ... 'Sunday'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);


-- Presence of a student or teacher at one class on one date.
-- 'present' rows come from the door cameras (confidence = face match score)
-- or a manual correction; 'absent' rows are created when the class ends.
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON UPDATE CASCADE ON DELETE CASCADE,
    date DATE NOT NULL,
    status enum_attendance_status NOT NULL DEFAULT 'absent',
    confidence DOUBLE PRECISION
);


-- Notes posted by a teacher for a subject and a group
-- (announcements, deadlines, attached documents)
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON UPDATE CASCADE ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    deadline TIMESTAMPTZ,
    file_path VARCHAR(255),                          -- stored file name in backend/uploads
    file_name VARCHAR(255),                          -- original file name
    file_type VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL
);


-- Camera boxes mounted at classroom doors
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
    api_key VARCHAR(255) NOT NULL UNIQUE,            -- sent by the box in the x-device-key header
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ
);


-- Registered faces: one 128-number signature per photo (photos are not stored)
CREATE TABLE face_signatures (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    signature JSON NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL
);


-- Content of the file attached to a note
CREATE TABLE note_files (
    note_id INTEGER PRIMARY KEY REFERENCES notes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data BYTEA NOT NULL
);
