const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// One registered face photo of a person, stored as a 128-number signature
// (the photo itself is never kept). A person can have up to 5.
const FaceSignature = sequelize.define("FaceSignature", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    signature: {
        type: DataTypes.JSON,
        allowNull: false
    }

}, {
    tableName: "face_signatures",
    timestamps: true,
    updatedAt: false
});

module.exports = FaceSignature;
