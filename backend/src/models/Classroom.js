const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Classroom = sequelize.define("Classroom", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    building: {
        type: DataTypes.STRING
    }

}, {
    tableName: "classrooms",
    timestamps: false
});

module.exports = Classroom;
