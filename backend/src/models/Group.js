const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Group = sequelize.define("Group", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    year: {
        type: DataTypes.STRING,
        allowNull: false
    },

    department: {
        type: DataTypes.STRING,
        allowNull: false
    }

}, {
    tableName: "groups",
    timestamps: false
});

module.exports = Group;
