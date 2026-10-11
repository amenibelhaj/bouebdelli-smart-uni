const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Teacher = sequelize.define("Teacher", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    speciality: {
        type: DataTypes.STRING
    },

    department: {
        type: DataTypes.STRING
    }
}, {
    tableName: "teachers",
    timestamps: false
});

module.exports = Teacher;
    