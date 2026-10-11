const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// The content of a file attached to a note, stored in the database
// (works on hosting platforms where the disk is wiped at each restart)
const NoteFile = sequelize.define("NoteFile", {
    note_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },

    data: {
        type: DataTypes.BLOB,
        allowNull: false
    }

}, {
    tableName: "note_files",
    timestamps: false
});

module.exports = NoteFile;
