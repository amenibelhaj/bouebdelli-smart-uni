const sequelize = require("../config/database");

const User = require("./User");
const Student = require("./Student");
const Teacher = require("./Teacher");
const Course = require("./Course");
const Group = require("./Group");
const Classroom = require("./Classroom");
const Schedule = require("./Schedule");
const Attendance = require("./Attendance");
const Note = require("./Note");
const Device = require("./Device");
const FaceSignature = require("./FaceSignature");
const NoteFile = require("./NoteFile");


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
// Notes (teacher -> course + group)
// =========================

Teacher.hasMany(Note, {
    foreignKey: "teacher_id"
});

Note.belongsTo(Teacher, {
    foreignKey: "teacher_id"
});


Course.hasMany(Note, {
    foreignKey: "course_id"
});

Note.belongsTo(Course, {
    foreignKey: "course_id"
});


Group.hasMany(Note, {
    foreignKey: "group_id"
});

Note.belongsTo(Group, {
    foreignKey: "group_id"
});


// =========================
// Door camera boxes
// =========================

Classroom.hasMany(Device, {
    foreignKey: "classroom_id"
});

Device.belongsTo(Classroom, {
    foreignKey: "classroom_id"
});


// =========================
// Face signatures and note files
// =========================

User.hasMany(FaceSignature, {
    foreignKey: "user_id",
    onDelete: "CASCADE"
});

FaceSignature.belongsTo(User, {
    foreignKey: "user_id"
});


Note.hasOne(NoteFile, {
    foreignKey: "note_id",
    onDelete: "CASCADE"
});

NoteFile.belongsTo(Note, {
    foreignKey: "note_id"
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
    Attendance,
    Note,
    Device,
    FaceSignature,
    NoteFile
};
