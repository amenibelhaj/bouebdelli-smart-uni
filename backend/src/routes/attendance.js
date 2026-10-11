const express = require("express");
const router = express.Router();

const { Op } = require("sequelize");

const {
    Attendance,
    User,
    Schedule,
    Course,
    Classroom,
    Group,
    Teacher
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");
const deviceMiddleware = require("../middleware/device");
const HttpError = require("../utils/httpError");
const ai = require("../services/faces");

const {
    findCurrentSchedule,
    expectedPeople,
    markPresent,
    finalizeEndedSessions
} = require("../services/attendance");

const {
    toDateString,
    dayNameOf,
    timeToMinutes,
    minutesNow,
    isValidDateString
} = require("../utils/time");


const scheduleInclude = {
    model: Schedule,
    include: [Course, Classroom, Group]
};

const userInclude = {
    model: User,
    attributes: ["id", "name", "email", "role"]
};


// Loads a schedule and checks the current user is its teacher (or an admin)
async function scheduleForStaff(req, scheduleId) {

    const schedule = await Schedule.findByPk(scheduleId, {
        include: [Course, Classroom, Group, { model: Teacher, include: [{ model: User, attributes: ["id", "name"] }] }]
    });

    if (!schedule) {
        throw new HttpError(404, "Cours introuvable");
    }

    if (req.user.role === "teacher") {

        const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });

        if (!teacher || teacher.id !== schedule.teacher_id) {
            throw new HttpError(403, "Ce cours n'est pas le vôtre");
        }
    }

    return schedule;
}


// =====================================================
// DOOR CAMERA BOX
// =====================================================

// The box calls this on startup / regularly to show which class is on now
router.get("/device/status", deviceMiddleware, async (req, res) => {

    const schedule = await findCurrentSchedule(req.device.classroom_id);

    res.json({
        device: req.device.name,
        classroom: req.device.Classroom ? req.device.Classroom.name : null,
        current_class: schedule
            ? {
                id: schedule.id,
                course: schedule.Course ? schedule.Course.name : null,
                group: schedule.Group ? schedule.Group.name : null,
                teacher: schedule.Teacher && schedule.Teacher.User ? schedule.Teacher.User.name : null,
                start_time: schedule.start_time,
                end_time: schedule.end_time
            }
            : null
    });
});


// The box sends a photo of the person at the door:
// { image: "data:image/jpeg;base64,..." }
// The face is matched only against people expected in the class happening now.
router.post("/device/scan", deviceMiddleware, async (req, res) => {

    const { image } = req.body || {};

    if (!image) {
        throw new HttpError(400, "Image manquante");
    }

    const schedule = await findCurrentSchedule(req.device.classroom_id);

    if (!schedule) {
        return res.status(404).json({
            recognized: false,
            message: "Aucun cours en ce moment dans cette salle"
        });
    }

    const people = await expectedPeople(schedule);

    const candidates = people.students.map(s => s.user_id);
    if (people.teacher) candidates.push(people.teacher.user_id);

    const result = await ai.identify(image, candidates);

    if (!result.match) {
        return res.json({
            recognized: false,
            faces_detected: result.faces_detected,
            message: result.faces_detected ? "Visage non reconnu" : "Aucun visage détecté"
        });
    }

    const person =
        people.students.find(s => s.user_id === result.user_id) ||
        (people.teacher && people.teacher.user_id === result.user_id ? people.teacher : null);

    if (!person) {
        return res.json({
            recognized: false,
            message: "Cette personne n'est pas inscrite à ce cours"
        });
    }

    const { alreadyPresent } = await markPresent(
        person.user_id,
        schedule.id,
        toDateString(),
        result.confidence
    );

    res.json({
        recognized: true,
        already_present: alreadyPresent,
        user_id: person.user_id,
        name: person.name,
        is_teacher: Boolean(people.teacher && people.teacher.user_id === person.user_id),
        confidence: result.confidence,
        course: schedule.Course ? schedule.Course.name : null,
        message: alreadyPresent
            ? `${person.name} est déjà marqué(e) présent(e)`
            : `Bienvenue ${person.name} — présence enregistrée`
    });
});


// =====================================================
// TEACHER / ADMIN: one class session on one date
// GET /session?schedule_id=1&date=2026-10-12
// Every student of the group with status present / absent / pending (class not over yet)
// =====================================================

router.get(
    "/session",
    authMiddleware,
    roleMiddleware("teacher", "admin"),
    async (req, res) => {

        const date = req.query.date || toDateString();

        if (!isValidDateString(date)) {
            throw new HttpError(400, "Date invalide");
        }

        const schedule = await scheduleForStaff(req, req.query.schedule_id);
        const people = await expectedPeople(schedule);

        // Record absences for this date if the class has ended
        // (in case the background job could not run, e.g. sleeping server)
        await finalizeEndedSessions(date).catch(() => {});

        const records = await Attendance.findAll({
            where: { schedule_id: schedule.id, date }
        });

        const byUser = new Map(records.map(r => [r.user_id, r]));

        const today = toDateString();
        const ended = date < today || (date === today && timeToMinutes(schedule.end_time) <= minutesNow());

        const statusOf = userId => {
            const record = byUser.get(userId);
            if (record) return { status: record.status, confidence: record.confidence };
            return { status: ended ? "absent" : "pending", confidence: null };
        };

        const students = people.students
            .map(s => ({ ...s, ...statusOf(s.user_id) }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            schedule,
            date,
            day_matches: dayNameOf(date) === schedule.day,
            ended,
            teacher: people.teacher ? { ...people.teacher, ...statusOf(people.teacher.user_id) } : null,
            students,
            summary: {
                present: students.filter(s => s.status === "present").length,
                absent: students.filter(s => s.status === "absent").length,
                pending: students.filter(s => s.status === "pending").length,
                total: students.length
            }
        });
    }
);


// Manual correction (camera missed someone, excused absence...)
// body: { schedule_id, date, user_id, status: "present" | "absent" }
router.put(
    "/session/mark",
    authMiddleware,
    roleMiddleware("teacher", "admin"),
    async (req, res) => {

        const { schedule_id, user_id, status } = req.body || {};
        const date = (req.body && req.body.date) || toDateString();

        if (!["present", "absent"].includes(status)) {
            throw new HttpError(400, "Statut invalide");
        }

        if (!isValidDateString(date) || date > toDateString()) {
            throw new HttpError(400, "Date invalide");
        }

        const schedule = await scheduleForStaff(req, schedule_id);
        const people = await expectedPeople(schedule);

        const isStudent = people.students.some(s => s.user_id === Number(user_id));
        const isTeacher = people.teacher && people.teacher.user_id === Number(user_id);

        // Teachers mark students; only the admin can change a teacher's own presence
        if (!isStudent && !(isTeacher && req.user.role === "admin")) {
            throw new HttpError(400, "Cette personne ne fait pas partie de ce cours");
        }

        const [record] = await Attendance.findOrCreate({
            where: { user_id, schedule_id: schedule.id, date },
            defaults: { status, confidence: null }
        });

        record.status = status;
        record.confidence = null;
        await record.save();

        res.json({ message: "Présence mise à jour", attendance: record });
    }
);


// =====================================================
// STUDENT / TEACHER: my own attendance history
// =====================================================

router.get(
    "/my",
    authMiddleware,
    roleMiddleware("student", "teacher"),
    async (req, res) => {

        const attendance = await Attendance.findAll({
            where: { user_id: req.user.id },
            include: [scheduleInclude],
            order: [["date", "DESC"]]
        });

        res.json(attendance);
    }
);


// =====================================================
// ADMIN: all attendance records
// filters: ?role=student|teacher &status= &group_id= &from=YYYY-MM-DD &to= &limit=
// =====================================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        const where = {};
        const userWhere = {};
        const scheduleWhere = {};

        if (req.query.status) where.status = req.query.status;
        if (req.query.role) userWhere.role = req.query.role;
        if (req.query.group_id) scheduleWhere.group_id = req.query.group_id;

        if (req.query.from || req.query.to) {
            where.date = {};
            if (isValidDateString(req.query.from)) where.date[Op.gte] = req.query.from;
            if (isValidDateString(req.query.to)) where.date[Op.lte] = req.query.to;
        }

        const attendance = await Attendance.findAll({
            where,
            include: [
                { ...userInclude, where: userWhere },
                { ...scheduleInclude, where: scheduleWhere }
            ],
            order: [["date", "DESC"], ["id", "DESC"]],
            limit: Math.min(Number(req.query.limit) || 500, 2000)
        });

        res.json(attendance);
    }
);


// ADMIN: record absences now for classes that have ended (default today)
// body: { date?: "YYYY-MM-DD" }
router.post(
    "/finalize",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        const date = (req.body && req.body.date) || toDateString();

        if (!isValidDateString(date)) {
            throw new HttpError(400, "Date invalide");
        }

        const result = await finalizeEndedSessions(date);

        res.json({
            message: `${result.absences} absence(s) enregistrée(s) pour ${result.sessions} cours`,
            ...result
        });
    }
);


module.exports = router;
