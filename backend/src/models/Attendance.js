const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Attendance = sequelize.define("Attendance", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },

    status: {
        type: DataTypes.ENUM("present", "absent"),
        allowNull: false,
        defaultValue: "absent"
    },

    confidence: {
        type: DataTypes.FLOAT,
        allowNull: true
    }

}, {
    tableName: "attendance",
    timestamps: false
});

module.exports = Attendance;