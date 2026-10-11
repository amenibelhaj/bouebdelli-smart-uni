-- =========================
-- USERS
-- =========================

INSERT INTO users
(name, email, password, role, status, "createdAt", "updatedAt")
VALUES
('Admin User', 'admin@smartuni.com',
'$2b$10$OHdvigTcKUcyDbcYaMVhEOBEvFoCzXspQdwF9tefJwiyFVNOyfPVa',
'admin', 'active', NOW(), NOW()),

('Ahmed Teacher', 'ahmed@smartuni.com',
'$2b$10$OHdvigTcKUcyDbcYaMVhEOBEvFoCzXspQdwF9tefJwiyFVNOyfPVa',
'teacher', 'active', NOW(), NOW()),

('Ameni Student', 'ameni@smartuni.com',
'$2b$10$OHdvigTcKUcyDbcYaMVhEOBEvFoCzXspQdwF9tefJwiyFVNOyfPVa',
'student', 'active', NOW(), NOW());

-- =========================
-- GROUPS
-- =========================

INSERT INTO groups
(name, year, department)
VALUES
('3CS-A', '3rd Year', 'Computer Science'),
('3CS-B', '3rd Year', 'Computer Science');


-- =========================
-- TEACHERS
-- =========================

INSERT INTO teachers
(user_id, speciality, department)
VALUES
(2, 'Artificial Intelligence', 'Computer Science');


-- =========================
-- STUDENTS
-- =========================

INSERT INTO students
(user_id, group_id, student_number)
VALUES
(3, 1, 'ST001');


-- =========================
-- COURSES
-- =========================

INSERT INTO courses
(name, description)
VALUES
('Database Systems', 'SQL and Database Management'),
('Machine Learning', 'Introduction to Machine Learning');


-- =========================
-- CLASSROOMS
-- =========================

INSERT INTO classrooms
(name, capacity, building)
VALUES
('B6', 30, 'Main Building'),
('A12', 25, 'Science Building');


-- =========================
-- SCHEDULES
-- =========================

INSERT INTO schedules
(group_id, course_id, teacher_id, classroom_id, day, start_time, end_time)
VALUES
(1, 1, 1, 1, 'Monday', '08:00', '10:00'),
(1, 2, 1, 2, 'Wednesday', '10:00', '12:00');

-- Attendance data

INSERT INTO attendance
(user_id, schedule_id, date, status, confidence)
VALUES
(3, 1, '2026-07-18', 'present', 0.98),
(2, 1, '2026-07-18', 'present', 0.96),
(3, 2, '2026-07-18', 'absent', NULL);