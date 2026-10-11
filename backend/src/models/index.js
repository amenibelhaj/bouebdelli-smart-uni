const sequelize = require("../config/database");

const User = require("./User");
const Student = require("./Student");
const Teacher = require("./Teacher");
const Course = require("./Course");
const Group = require("./Group");
const Classroom = require("./Classroom");
const Schedule = require("./Schedule");
const Attendance = require("./Attendance");


// =========================
// User relationships
// =========================

User.hasOne(Student, {
    foreignKey: "user_id"
});

Student.belongsTo(User, {
    foreignKey: "user_id"
});


User.hasOne(Teacher, {
    foreignKey: "user_id"
});

Teacher.belongsTo(User, {
    foreignKey: "user_id"
});


// =========================
// Group - Student
// =========================

Group.hasMany(Student, {
    foreignKey: "group_id"
});

Student.belongsTo(Group, {
    foreignKey: "group_id"
});


// =========================
// Schedule relationships
// =========================

Group.hasMany(Schedule, {
    foreignKey: "group_id"
});

Schedule.belongsTo(Group, {
    foreignKey: "group_id"
});


Course.hasMany(Schedule, {
    foreignKey: "course_id"
});

Schedule.belongsTo(Course, {
    foreignKey: "course_id"
});


Teacher.hasMany(Schedule, {
    foreignKey: "teacher_id"
});

Schedule.belongsTo(Teacher, {
    foreignKey: "teacher_id"
});


Classroom.hasMany(Schedule, {
    foreignKey: "classroom_id"
});

Schedule.belongsTo(Classroom, {
    foreignKey: "classroom_id"
});


// =========================
// Attendance relationships
// =========================

// One user can have many attendance records
User.hasMany(Attendance, {
    foreignKey: "user_id"
});

Attendance.belongsTo(User, {
    foreignKey: "user_id"
});

// One schedule can have many attendance records
Schedule.hasMany(Attendance, {
    foreignKey: "schedule_id"
});

Attendance.belongsTo(Schedule, {
    foreignKey: "schedule_id"
});


// =========================
// Export models
// =========================

module.exports = {
    sequelize,
    User,
    Student,
    Teacher,
    Course,
    Group,
    Classroom,
    Schedule,
    Attendance
};
