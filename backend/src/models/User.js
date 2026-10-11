const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },

    password: {
        type: DataTypes.STRING,
        allowNull: false
    },

    role: {
        type: DataTypes.ENUM("student", "teacher", "admin"),
        allowNull: false
    },

    status: {
        type: DataTypes.ENUM("pending", "active"),
        defaultValue: "pending"
    }

}, {
    tableName: "users",
    timestamps: true
});

module.exports = User;
