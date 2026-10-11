// Attendance rules shared by the routes and the background job.
//
// - A camera box at a classroom door recognizes a person -> they are marked "present"
//   for the class happening in that room right now.
// - The camera cannot see who did NOT come. So when a class ends, every student of the
//   group (and the teacher) without a record for that date is marked "absent".

const { Op } = require("sequelize");

const {
    Attendance,
    Schedule,
    Student,
    Teacher,
    User,
    Course,
    Classroom,
    Group
} = require("../models");

const {
    toDateString,
    dayName,
    dayNameOf,
    timeToMinutes,
    minutesNow
} = require("../utils/time");


function earlyMinutes() {
    return Number(process.env.CHECKIN_EARLY_MINUTES || 15);
}


// The class taking place in a classroom right now (check-in opens a few minutes early)
async function findCurrentSchedule(classroomId, now = new Date()) {

    const schedules = await Schedule.findAll({
        where: {
            classroom_id: classroomId,
            day: dayName(now)
        },
        include: [Course, Group, Classroom, { model: Teacher, include: [{ model: User, attributes: ["id", "name"] }] }]
    });

    const current = minutesNow(now);

    return schedules.find(schedule =>
        current >= timeToMinutes(schedule.start_time) - earlyMinutes() &&
        current <= timeToMinutes(schedule.end_time)
    ) || null;
}


// User ids of everyone expected in a class: the group's students + the teacher
async function expectedPeople(schedule) {

    const students = await Student.findAll({
        where: { group_id: schedule.group_id },
        include: [{ model: User, attributes: ["id", "name", "status"] }]
    });

    const teacher = await Teacher.findByPk(schedule.teacher_id, {
        include: [{ model: User, attributes: ["id", "name", "status"] }]
    });

    return {
        // Accounts not yet activated by the admin are ignored
        students: students.filter(s => s.User && s.User.status === "active").map(s => ({
            user_id: s.user_id,
            name: s.User.name,
            student_number: s.student_number
        })),
        teacher: teacher && teacher.User
            ? { user_id: teacher.user_id, name: teacher.User.name }
            : null
    };
}


// Marks one person present (or updates an earlier "absent" to "present")
async function markPresent(userId, scheduleId, date, confidence) {

    const existing = await Attendance.findOne({
        where: { user_id: userId, schedule_id: scheduleId, date }
    });

    if (existing && existing.status === "present") {
        return { attendance: existing, alreadyPresent: true };
    }

    if (existing) {
        existing.status = "present";
        existing.confidence = confidence;
        await existing.save();
        return { attendance: existing, alreadyPresent: false };
    }

    const attendance = await Attendance.create({
        user_id: userId,
        schedule_id: scheduleId,
        date,
        status: "present",
        confidence
    });

    return { attendance, alreadyPresent: false };
}


// Marks everyone without a record as absent, for one class on one date.
// Safe to run several times: it never creates duplicates.
async function finalizeSession(schedule, date) {

    const people = await expectedPeople(schedule);

    const userIds = people.students.map(s => s.user_id);

    if (people.teacher) {
        userIds.push(people.teacher.user_id);
    }

    if (userIds.length === 0) {
        return 0;
    }

    const existing = await Attendance.findAll({
        where: {
            schedule_id: schedule.id,
            date,
            user_id: { [Op.in]: userIds }
        },
        attributes: ["user_id"]
    });

    const recorded = new Set(existing.map(a => a.user_id));

    const missing = userIds
        .filter(id => !recorded.has(id))
        .map(id => ({
            user_id: id,
            schedule_id: schedule.id,
            date,
            status: "absent",
            confidence: null
        }));

    if (missing.length > 0) {
        await Attendance.bulkCreate(missing);
    }

    return missing.length;
}


// Finalizes every class of a given date that has already ended.
// date: "YYYY-MM-DD" (default today). For past dates every class of that day is finalized.
async function finalizeEndedSessions(date = toDateString(), now = new Date()) {

    const today = toDateString(now);

    if (date > today) {
        return { sessions: 0, absences: 0 };
    }

    const schedules = await Schedule.findAll({
        where: { day: dayNameOf(date) }
    });

    let sessions = 0;
    let absences = 0;

    for (const schedule of schedules) {

        const ended = date < today || timeToMinutes(schedule.end_time) <= minutesNow(now);

        if (!ended) continue;

        absences += await finalizeSession(schedule, date);
        sessions += 1;
    }

    return { sessions, absences };
}


// Runs finalizeEndedSessions for today every minute while the server is up
function startAbsenceJob() {

    const run = async () => {
        try {
            const result = await finalizeEndedSessions();
            if (result.absences > 0) {
                console.log(`Absences recorded: ${result.absences}`);
            }
        } catch (error) {
            console.error("Absence job failed:", error.message);
        }
    };

    run();

    return setInterval(run, 60 * 1000);
}


module.exports = {
    findCurrentSchedule,
    expectedPeople,
    markPresent,
    finalizeSession,
    finalizeEndedSessions,
    startAbsenceJob
};
