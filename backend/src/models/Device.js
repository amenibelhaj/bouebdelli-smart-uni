const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// A camera box mounted at the door of a classroom.
// It authenticates with its api_key (header "x-device-key").
const Device = sequelize.define("Device", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    classroom_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    api_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },

    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },

    last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true
    }

}, {
    tableName: "devices",
    timestamps: false
});

module.exports = Device;
