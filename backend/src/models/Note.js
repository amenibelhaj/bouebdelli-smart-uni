const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// A note posted by a teacher for one course and one group
// (announcement, homework reminder, deadline, attached document...)
const Note = sequelize.define("Note", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    teacher_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    title: {
        type: DataTypes.STRING,
        allowNull: false
    },

    message: {
        type: DataTypes.TEXT
    },

    // Optional deadline (e.g. hand in the report before this date)
    deadline: {
        type: DataTypes.DATE,
        allowNull: true
    },

    // Optional attached file (stored in backend/uploads)
    file_path: {
        type: DataTypes.STRING
    },

    file_name: {
        type: DataTypes.STRING
    },

    file_type: {
        type: DataTypes.STRING
    }

}, {
    tableName: "notes",
    timestamps: true
});

module.exports = Note;
