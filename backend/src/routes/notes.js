const express = require("express");
const router = express.Router();

const fs = require("fs");

const {
    Note,
    Teacher,
    Student,
    Schedule,
    Course,
    Group,
    User,
    NoteFile
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");
const HttpError = require("../utils/httpError");
const { DB_MARKER, readAttachment, deleteAttachment, attachmentPath } = require("../utils/files");


// Removes a note's current attachment, wherever it is stored
async function removeAttachment(note) {
    if (note.file_path === DB_MARKER) {
        await NoteFile.destroy({ where: { note_id: note.id } });
    } else {
        deleteAttachment(note.file_path);
    }

    note.file_path = null;
    note.file_name = null;
    note.file_type = null;
}


const noteIncludes = [
    Course,
    Group,
    {
        model: Teacher,
        include: [{ model: User, attributes: ["id", "name"] }]
    }
];


async function currentTeacher(userId) {
    const teacher = await Teacher.findOne({ where: { user_id: userId } });

    if (!teacher) {
        throw new HttpError(404, "Profil enseignant introuvable");
    }

    return teacher;
}


// Loads a note and checks the current user may change it (its author or an admin)
async function editableNote(req) {

    const note = await Note.findByPk(req.params.id);

    if (!note) {
        throw new HttpError(404, "Note introuvable");
    }

    if (req.user.role === "admin") {
        return note;
    }

    const teacher = await currentTeacher(req.user.id);

    if (note.teacher_id !== teacher.id) {
        throw new HttpError(403, "Vous ne pouvez modifier que vos propres notes");
    }

    return note;
}


function parseDeadline(value) {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new HttpError(400, "Date limite invalide");
    }

    return date;
}


// =========================
// LIST NOTES
// student: notes for their group | teacher: their own notes | admin: all
// optional ?course_id=
// =========================

router.get("/", authMiddleware, async (req, res) => {

    const where = {};

    if (req.query.course_id) {
        where.course_id = req.query.course_id;
    }

    if (req.user.role === "student") {

        const student = await Student.findOne({ where: { user_id: req.user.id } });

        if (!student || !student.group_id) {
            return res.json([]);
        }

        where.group_id = student.group_id;

    } else if (req.user.role === "teacher") {

        const teacher = await currentTeacher(req.user.id);
        where.teacher_id = teacher.id;
    }

    const notes = await Note.findAll({
        where,
        include: noteIncludes,
        order: [["createdAt", "DESC"]]
    });

    res.json(notes);
});


// =========================
// CREATE NOTE (teacher)
// body: { course_id, group_id, title, message, deadline?, file?: { name, data } }
// =========================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("teacher"),
    async (req, res) => {

        const teacher = await currentTeacher(req.user.id);
        const { course_id, group_id, title, message, deadline, file } = req.body || {};

        if (!course_id || !group_id || !title || !String(title).trim()) {
            throw new HttpError(400, "Matière, groupe et titre sont obligatoires");
        }

        // A teacher can only post for a course they teach to that group
        const teaches = await Schedule.findOne({
            where: { teacher_id: teacher.id, course_id, group_id }
        });

        if (!teaches) {
            throw new HttpError(403, "Vous n'enseignez pas cette matière à ce groupe");
        }

        const attachment = file ? readAttachment(file) : null;

        const note = await Note.create({
            teacher_id: teacher.id,
            course_id,
            group_id,
            title: String(title).trim(),
            message: message || null,
            deadline: parseDeadline(deadline) ?? null,
            ...(attachment ? attachment.meta : {})
        });

        if (attachment) {
            await NoteFile.create({ note_id: note.id, data: attachment.buffer });
        }

        res.status(201).json({
            message: "Note publiée",
            note: await Note.findByPk(note.id, { include: noteIncludes })
        });
    }
);


// =========================
// UPDATE NOTE (author or admin)
// body: any of { title, message, deadline, file, remove_file }
// =========================

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("teacher", "admin"),
    async (req, res) => {

        const note = await editableNote(req);
        const { title, message, deadline, file, remove_file } = req.body || {};

        if (title !== undefined) {
            if (!String(title).trim()) throw new HttpError(400, "Le titre est obligatoire");
            note.title = String(title).trim();
        }

        if (message !== undefined) {
            note.message = message || null;
        }

        const parsedDeadline = parseDeadline(deadline);
        if (parsedDeadline !== undefined) {
            note.deadline = parsedDeadline;
        }

        const attachment = file ? readAttachment(file) : null;

        if (attachment || remove_file) {
            await removeAttachment(note);
        }

        if (attachment) {
            Object.assign(note, attachment.meta);
            await NoteFile.create({ note_id: note.id, data: attachment.buffer });
        }

        await note.save();

        res.json({
            message: "Note modifiée",
            note: await Note.findByPk(note.id, { include: noteIncludes })
        });
    }
);


// =========================
// DELETE NOTE (author or admin)
// =========================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("teacher", "admin"),
    async (req, res) => {

        const note = await editableNote(req);

        await removeAttachment(note);
        await note.destroy();

        res.json({ message: "Note supprimée" });
    }
);


// =========================
// DOWNLOAD ATTACHED FILE
// allowed: admin, the author, students of the note's group
// =========================

router.get("/:id/file", authMiddleware, async (req, res) => {

    const note = await Note.findByPk(req.params.id);

    if (!note || !note.file_path) {
        throw new HttpError(404, "Fichier introuvable");
    }

    if (req.user.role === "student") {

        const student = await Student.findOne({ where: { user_id: req.user.id } });

        if (!student || student.group_id !== note.group_id) {
            throw new HttpError(403, "Accès refusé");
        }

    } else if (req.user.role === "teacher") {

        const teacher = await currentTeacher(req.user.id);

        if (note.teacher_id !== teacher.id) {
            throw new HttpError(403, "Accès refusé");
        }
    }

    const name = note.file_name || "fichier";

    if (note.file_path === DB_MARKER) {

        const stored = await NoteFile.findByPk(note.id);

        if (!stored) {
            throw new HttpError(404, "Fichier introuvable");
        }

        res.attachment(name);
        res.type(note.file_type || "application/octet-stream");
        return res.send(stored.data);
    }

    // Older files stored on disk
    const fullPath = attachmentPath(note.file_path);

    if (!fs.existsSync(fullPath)) {
        throw new HttpError(404, "Fichier introuvable sur le serveur");
    }

    res.download(fullPath, name);
});


module.exports = router;
