const express = require("express");
const router = express.Router();

const { Op } = require("sequelize");

const {
    Schedule,
    Course,
    Teacher,
    Classroom,
    Group,
    User,
    Student,
    Note,
    Attendance
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");
const HttpError = require("../utils/httpError");
const { DAYS, timeToMinutes } = require("../utils/time");


const scheduleIncludes = [
    Course,
    Classroom,
    Group,
    {
        model: Teacher,
        include: [{ model: User, attributes: ["id", "name", "email"] }]
    }
];

const dayOrder = day => (DAYS.indexOf(day) + 6) % 7; // Monday first


function sortSchedules(schedules) {
    return schedules.sort((a, b) =>
        dayOrder(a.day) - dayOrder(b.day) ||
        timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );
}


// Validates the body of a create / update and checks for clashes
// (same group, teacher or classroom already busy at that time)
async function validateSchedule(data, excludeId = null) {

    const required = ["group_id", "course_id", "teacher_id", "classroom_id", "day", "start_time", "end_time"];

    for (const field of required) {
        if (data[field] === undefined || data[field] === null || data[field] === "") {
            throw new HttpError(400, "Tous les champs sont obligatoires");
        }
    }

    if (!DAYS.includes(data.day)) {
        throw new HttpError(400, "Jour invalide");
    }

    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(data.start_time) || !/^\d{2}:\d{2}(:\d{2})?$/.test(data.end_time)) {
        throw new HttpError(400, "Heure invalide (format HH:MM)");
    }

    const start = timeToMinutes(data.start_time);
    const end = timeToMinutes(data.end_time);

    if (end <= start) {
        throw new HttpError(400, "L'heure de fin doit être après l'heure de début");
    }

    const [group, course, teacher, classroom] = await Promise.all([
        Group.findByPk(data.group_id),
        Course.findByPk(data.course_id),
        Teacher.findByPk(data.teacher_id),
        Classroom.findByPk(data.classroom_id)
    ]);

    if (!group || !course || !teacher || !classroom) {
        throw new HttpError(400, "Groupe, matière, enseignant ou salle introuvable");
    }

    const sameDay = await Schedule.findAll({
        where: {
            day: data.day,
            ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
            [Op.or]: [
                { group_id: data.group_id },
                { teacher_id: data.teacher_id },
                { classroom_id: data.classroom_id }
            ]
        }
    });

    for (const other of sameDay) {

        const overlaps =
            start < timeToMinutes(other.end_time) &&
            timeToMinutes(other.start_time) < end;

        if (!overlaps) continue;

        if (other.group_id === Number(data.group_id)) {
            throw new HttpError(409, "Ce groupe a déjà un cours sur ce créneau");
        }

        if (other.teacher_id === Number(data.teacher_id)) {
            throw new HttpError(409, "Cet enseignant a déjà un cours sur ce créneau");
        }

        throw new HttpError(409, "Cette salle est déjà occupée sur ce créneau");
    }
}


function pickScheduleFields(body = {}) {
    const { group_id, course_id, teacher_id, classroom_id, day, start_time, end_time } = body;
    return { group_id, course_id, teacher_id, classroom_id, day, start_time, end_time };
}


// =========================
// MY TIMETABLE (student or teacher)
// Each class comes with its course, time, teacher name, classroom
// and the notes the teacher posted for that course and group.
// =========================

router.get(
    "/my",
    authMiddleware,
    roleMiddleware("student", "teacher"),
    async (req, res) => {

        let where;

        if (req.user.role === "student") {

            const student = await Student.findOne({ where: { user_id: req.user.id } });

            if (!student || !student.group_id) {
                return res.json([]);
            }

            where = { group_id: student.group_id };

        } else {

            const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });

            if (!teacher) {
                return res.json([]);
            }

            where = { teacher_id: teacher.id };
        }

        const schedules = await Schedule.findAll({
            where,
            include: scheduleIncludes
        });

        if (schedules.length === 0) {
            return res.json([]);
        }

        const notes = await Note.findAll({
            where: {
                [Op.or]: schedules.map(s => ({
                    course_id: s.course_id,
                    group_id: s.group_id,
                    teacher_id: s.teacher_id
                }))
            },
            order: [["createdAt", "DESC"]]
        });

        const result = sortSchedules(schedules).map(schedule => ({
            ...schedule.toJSON(),
            notes: notes.filter(note =>
                note.course_id === schedule.course_id &&
                note.group_id === schedule.group_id &&
                note.teacher_id === schedule.teacher_id
            )
        }));

        res.json(result);
    }
);


// =========================
// GET ALL SCHEDULES (admin), optional ?group_id= &teacher_id= &classroom_id=
// =========================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        const where = {};

        for (const key of ["group_id", "teacher_id", "classroom_id"]) {
            if (req.query[key]) where[key] = req.query[key];
        }

        const schedules = await Schedule.findAll({
            where,
            include: scheduleIncludes
        });

        res.json(sortSchedules(schedules));
    }
);


// =========================
// CREATE SCHEDULE (admin)
// =========================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        const data = pickScheduleFields(req.body);

        await validateSchedule(data);

        const schedule = await Schedule.create(data);

        res.status(201).json({
            message: "Cours ajouté à l'emploi du temps",
            schedule
        });
    }
);


// =========================
// UPDATE SCHEDULE (admin)
// =========================

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        const schedule = await Schedule.findByPk(req.params.id);

        if (!schedule) {
            return res.status(404).json({
                message: "Cours introuvable"
            });
        }

        const data = { ...schedule.toJSON(), ...pickScheduleFields(req.body) };
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        await validateSchedule(data, schedule.id);

        await schedule.update(pickScheduleFields(data));

        res.json({
            message: "Cours modifié",
            schedule
        });
    }
);


// =========================
// DELETE SCHEDULE (admin)
// =========================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        const schedule = await Schedule.findByPk(req.params.id);

        if (!schedule) {
            return res.status(404).json({
                message: "Cours introuvable"
            });
        }

        // Its attendance history goes with it
        await schedule.sequelize.transaction(async transaction => {
            await Attendance.destroy({ where: { schedule_id: schedule.id }, transaction });
            await schedule.destroy({ transaction });
        });

        res.json({
            message: "Cours supprimé"
        });
    }
);


module.exports = router;
