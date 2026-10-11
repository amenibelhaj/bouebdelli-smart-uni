const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Schedule = sequelize.define("Schedule", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    teacher_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    classroom_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    day: {
        type: DataTypes.STRING,
        allowNull: false
    },

    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },

    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    }

}, {
    tableName: "schedules",
    timestamps: false
});

module.exports = Schedule;
