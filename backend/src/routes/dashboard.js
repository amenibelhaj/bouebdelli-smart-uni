const express = require("express");
const router = express.Router();

const { Op, fn, col } = require("sequelize");

const {
    User,
    Student,
    Teacher,
    Attendance,
    Schedule,
    Course,
    Classroom,
    Group,
    Note,
    Device
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");
const { toDateString, dayName, timeToMinutes, minutesNow } = require("../utils/time");
const { expectedPeople } = require("../services/attendance");


function rate(present, absent) {
    const total = present + absent;
    return total === 0 ? null : Math.round((present / total) * 100);
}

function countStatus(records) {
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    return { present, absent, rate: rate(present, absent) };
}

function byStartTime(a, b) {
    return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
}


// =====================================================
// STUDENT DASHBOARD
// =====================================================

router.get(
    "/student",
    authMiddleware,
    roleMiddleware("student"),
    async (req, res) => {

        const student = await Student.findOne({
            where: { user_id: req.user.id },
            include: [
                { model: User, attributes: { exclude: ["password"] } },
                { model: Group }
            ]
        });

        if (!student) {
            return res.status(404).json({
                message: "Profil étudiant introuvable"
            });
        }

        const attendance = await Attendance.findAll({
            where: { user_id: req.user.id },
            include: [{ model: Schedule, include: [Course] }]
        });

        // Absences per course
        const perCourse = {};

        for (const record of attendance) {
            const name = record.Schedule && record.Schedule.Course ? record.Schedule.Course.name : "—";
            perCourse[name] = perCourse[name] || { course: name, present: 0, absent: 0 };
            perCourse[name][record.status] += 1;
        }

        const todaysClasses = student.group_id
            ? await Schedule.findAll({
                where: { group_id: student.group_id, day: dayName() },
                include: [Course, Classroom, { model: Teacher, include: [{ model: User, attributes: ["name"] }] }]
            })
            : [];

        const upcomingDeadlines = student.group_id
            ? await Note.findAll({
                where: { group_id: student.group_id, deadline: { [Op.gte]: new Date() } },
                include: [Course],
                order: [["deadline", "ASC"]],
                limit: 5
            })
            : [];

        res.json({
            student: student.User,
            student_number: student.student_number,
            group: student.Group,
            attendance: countStatus(attendance),
            per_course: Object.values(perCourse).sort((a, b) => b.absent - a.absent),
            today: todaysClasses.sort(byStartTime),
            upcoming_deadlines: upcomingDeadlines
        });
    }
);


// =====================================================
// TEACHER DASHBOARD
// =====================================================

router.get(
    "/teacher",
    authMiddleware,
    roleMiddleware("teacher"),
    async (req, res) => {

        const teacher = await Teacher.findOne({
            where: { user_id: req.user.id },
            include: [{ model: User, attributes: { exclude: ["password"] } }]
        });

        if (!teacher) {
            return res.status(404).json({
                message: "Profil enseignant introuvable"
            });
        }

        const schedules = await Schedule.findAll({
            where: { teacher_id: teacher.id },
            include: [Course, Classroom, Group]
        });

        const scheduleIds = schedules.map(s => s.id);

        // Attendance of students in this teacher's classes
        const studentRecords = scheduleIds.length
            ? await Attendance.findAll({
                where: { schedule_id: { [Op.in]: scheduleIds }, user_id: { [Op.ne]: req.user.id } },
                attributes: ["status"]
            })
            : [];

        // The teacher's own presence
        const ownRecords = await Attendance.findAll({
            where: { user_id: req.user.id },
            attributes: ["status"]
        });

        const groups = new Set(schedules.map(s => s.group_id));
        const notesCount = await Note.count({ where: { teacher_id: teacher.id } });

        res.json({
            teacher: teacher.User,
            speciality: teacher.speciality,
            department: teacher.department,
            schedules,
            today: schedules.filter(s => s.day === dayName()).sort(byStartTime),
            statistics: {
                totalClasses: schedules.length,
                groups: groups.size,
                notes: notesCount,
                students_attendance: countStatus(studentRecords),
                own_attendance: countStatus(ownRecords)
            }
        });
    }
);


// Classes taking place right now, with how many expected people are present
async function liveClasses() {

    const now = minutesNow();

    const schedules = await Schedule.findAll({
        where: { day: dayName() },
        include: [Course, Classroom, Group, { model: Teacher, include: [{ model: User, attributes: ["id", "name"] }] }]
    });

    const live = schedules
        .filter(s => timeToMinutes(s.start_time) <= now && now <= timeToMinutes(s.end_time))
        .sort(byStartTime);

    const today = toDateString();
    const result = [];

    for (const schedule of live) {

        const people = await expectedPeople(schedule);

        const presentRows = await Attendance.findAll({
            where: { schedule_id: schedule.id, date: today, status: "present" },
            attributes: ["user_id"]
        });

        const present = new Set(presentRows.map(r => r.user_id));

        result.push({
            id: schedule.id,
            course: schedule.Course ? schedule.Course.name : null,
            group: schedule.Group ? schedule.Group.name : null,
            classroom: schedule.Classroom ? schedule.Classroom.name : null,
            teacher: schedule.Teacher && schedule.Teacher.User ? schedule.Teacher.User.name : null,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            students_present: people.students.filter(s => present.has(s.user_id)).length,
            students_total: people.students.length,
            teacher_present: Boolean(people.teacher && present.has(people.teacher.user_id))
        });
    }

    return result;
}


// =====================================================
// ADMIN DASHBOARD
// =====================================================

async function attendanceTotals(role, extraWhere = {}) {

    const rows = await Attendance.findAll({
        where: extraWhere,
        include: [{ model: User, attributes: [], where: { role } }],
        attributes: ["status", [fn("COUNT", col("Attendance.id")), "count"]],
        group: ["Attendance.status"],
        raw: true
    });

    const result = { present: 0, absent: 0 };

    for (const row of rows) {
        result[row.status] = Number(row.count);
    }

    result.rate = rate(result.present, result.absent);

    return result;
}


router.get(
    "/admin",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        const today = toDateString();

        const [
            students,
            teachers,
            pendingUsers,
            courses,
            classrooms,
            groups,
            schedules,
            devices
        ] = await Promise.all([
            User.count({ where: { role: "student" } }),
            User.count({ where: { role: "teacher" } }),
            User.count({ where: { status: "pending" } }),
            Course.count(),
            Classroom.count(),
            Group.count(),
            Schedule.count(),
            Device.count()
        ]);

        const [studentTotals, teacherTotals, studentToday, teacherToday] = await Promise.all([
            attendanceTotals("student"),
            attendanceTotals("teacher"),
            attendanceTotals("student", { date: today }),
            attendanceTotals("teacher", { date: today })
        ]);

        // Last 7 days, students only
        const from = new Date();
        from.setDate(from.getDate() - 6);

        const dailyRows = await Attendance.findAll({
            where: { date: { [Op.gte]: toDateString(from) } },
            include: [{ model: User, attributes: [], where: { role: "student" } }],
            attributes: ["date", "status", [fn("COUNT", col("Attendance.id")), "count"]],
            group: ["Attendance.date", "Attendance.status"],
            raw: true
        });

        const last7Days = [];

        for (let i = 0; i < 7; i++) {
            const day = new Date(from);
            day.setDate(from.getDate() + i);
            const date = toDateString(day);

            const rowsOfDay = dailyRows.filter(r => r.date === date);
            const present = Number((rowsOfDay.find(r => r.status === "present") || {}).count || 0);
            const absent = Number((rowsOfDay.find(r => r.status === "absent") || {}).count || 0);

            last7Days.push({ date, present, absent });
        }

        // Students with the most absences
        const topAbsentRows = await Attendance.findAll({
            where: { status: "absent" },
            include: [{ model: User, attributes: ["id", "name"], where: { role: "student" } }],
            attributes: ["user_id", [fn("COUNT", col("Attendance.id")), "absences"]],
            group: ["Attendance.user_id", "User.id"],
            order: [[fn("COUNT", col("Attendance.id")), "DESC"]],
            limit: 5,
            raw: true,
            nest: true
        });

        const live = await liveClasses();

        res.json({
            live_classes: live,
            statistics: {
                students,
                teachers,
                pendingUsers,
                courses,
                classrooms,
                groups,
                schedules,
                devices
            },
            attendance: {
                students: studentTotals,
                teachers: teacherTotals,
                today: {
                    students: studentToday,
                    teachers: teacherToday
                }
            },
            last_7_days: last7Days,
            top_absent_students: topAbsentRows.map(r => ({
                user_id: r.user_id,
                name: r.User.name,
                absences: Number(r.absences)
            }))
        });
    }
);


// Only the classes happening now (the admin dashboard refreshes this often)
router.get(
    "/live",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {
        res.json(await liveClasses());
    }
);


module.exports = router;
