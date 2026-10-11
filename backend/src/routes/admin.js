// Admin management of everything: users (students, teachers, admins), groups,
// courses, classrooms, door camera boxes, and face photos for recognition.

const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const {
    sequelize,
    User,
    Student,
    Teacher,
    Group,
    Course,
    Classroom,
    Device,
    Attendance,
    Schedule,
    Note
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");
const HttpError = require("../utils/httpError");
const ai = require("../services/aiClient");


router.use(authMiddleware, roleMiddleware("admin"));


const ROLES = ["student", "teacher", "admin"];
const STATUSES = ["pending", "active"];

const userIncludes = [
    { model: Student, include: [Group] },
    { model: Teacher }
];

function cleanEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findUser(id) {
    const user = await User.findByPk(id, {
        attributes: { exclude: ["password"] },
        include: userIncludes
    });

    if (!user) {
        throw new HttpError(404, "Utilisateur introuvable");
    }

    return user;
}


// =====================================================
// USERS
// =====================================================

// GET /api/admin/users?role=student&status=pending&group_id=1
router.get("/users", async (req, res) => {

    const where = {};

    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;

    const include = [
        {
            model: Student,
            include: [Group],
            ...(req.query.group_id ? { where: { group_id: req.query.group_id } } : {})
        },
        { model: Teacher }
    ];

    const users = await User.findAll({
        where,
        attributes: { exclude: ["password"] },
        include,
        order: [["role", "ASC"], ["name", "ASC"]]
    });

    res.json(users);
});


// Create a user and their student / teacher profile in one go
// body: { name, email, password, role, status,
//         student_number, group_id            (students)
//         speciality, department }            (teachers)
router.post("/users", async (req, res) => {

    const body = req.body || {};
    const email = cleanEmail(body.email);

    if (!body.name || !String(body.name).trim()) throw new HttpError(400, "Le nom est obligatoire");
    if (!isEmail(email)) throw new HttpError(400, "Email invalide");
    if (!body.password || String(body.password).length < 6) {
        throw new HttpError(400, "Le mot de passe doit contenir au moins 6 caractères");
    }
    if (!ROLES.includes(body.role)) throw new HttpError(400, "Rôle invalide");
    if (body.role === "student" && !body.student_number) {
        throw new HttpError(400, "Le numéro d'inscription est obligatoire pour un étudiant");
    }

    const created = await sequelize.transaction(async transaction => {

        const user = await User.create({
            name: String(body.name).trim(),
            email,
            password: await bcrypt.hash(String(body.password), 10),
            role: body.role,
            status: STATUSES.includes(body.status) ? body.status : "active"
        }, { transaction });

        if (body.role === "student") {
            await Student.create({
                user_id: user.id,
                group_id: body.group_id || null,
                student_number: String(body.student_number).trim()
            }, { transaction });
        }

        if (body.role === "teacher") {
            await Teacher.create({
                user_id: user.id,
                speciality: body.speciality || null,
                department: body.department || null
            }, { transaction });
        }

        return user;
    });

    res.status(201).json({
        message: "Utilisateur créé",
        user: await findUser(created.id)
    });
});


// Update a user (and their profile). Password only changes if a new one is sent.
router.put("/users/:id", async (req, res) => {

    const body = req.body || {};
    const user = await User.findByPk(req.params.id);

    if (!user) throw new HttpError(404, "Utilisateur introuvable");

    if (body.role !== undefined && body.role !== user.role) {
        throw new HttpError(400, "Le rôle ne peut pas être modifié ; supprimez et recréez l'utilisateur");
    }

    await sequelize.transaction(async transaction => {

        if (body.name !== undefined) {
            if (!String(body.name).trim()) throw new HttpError(400, "Le nom est obligatoire");
            user.name = String(body.name).trim();
        }

        if (body.email !== undefined) {
            const email = cleanEmail(body.email);
            if (!isEmail(email)) throw new HttpError(400, "Email invalide");
            user.email = email;
        }

        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) throw new HttpError(400, "Statut invalide");
            if (user.id === req.user.id && body.status !== "active") {
                throw new HttpError(400, "Vous ne pouvez pas désactiver votre propre compte");
            }
            user.status = body.status;
        }

        if (body.password) {
            if (String(body.password).length < 6) {
                throw new HttpError(400, "Le mot de passe doit contenir au moins 6 caractères");
            }
            user.password = await bcrypt.hash(String(body.password), 10);
        }

        await user.save({ transaction });

        if (user.role === "student") {
            const student = await Student.findOne({ where: { user_id: user.id }, transaction });

            if (student) {
                if (body.group_id !== undefined) student.group_id = body.group_id || null;
                if (body.student_number) student.student_number = String(body.student_number).trim();
                await student.save({ transaction });
            }
        }

        if (user.role === "teacher") {
            const teacher = await Teacher.findOne({ where: { user_id: user.id }, transaction });

            if (teacher) {
                if (body.speciality !== undefined) teacher.speciality = body.speciality || null;
                if (body.department !== undefined) teacher.department = body.department || null;
                await teacher.save({ transaction });
            }
        }
    });

    res.json({
        message: "Utilisateur modifié",
        user: await findUser(user.id)
    });
});


// Delete a user, their profile and attendance history.
// A teacher who still has classes in the timetable cannot be deleted.
router.delete("/users/:id", async (req, res) => {

    const user = await User.findByPk(req.params.id);

    if (!user) throw new HttpError(404, "Utilisateur introuvable");

    if (user.id === req.user.id) {
        throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte");
    }

    await sequelize.transaction(async transaction => {

        const teacher = await Teacher.findOne({ where: { user_id: user.id }, transaction });

        if (teacher) {
            const classes = await Schedule.count({ where: { teacher_id: teacher.id }, transaction });

            if (classes > 0) {
                throw new HttpError(409, "Cet enseignant a encore des cours dans l'emploi du temps");
            }

            await Note.destroy({ where: { teacher_id: teacher.id }, transaction });
            await teacher.destroy({ transaction });
        }

        await Student.destroy({ where: { user_id: user.id }, transaction });
        await Attendance.destroy({ where: { user_id: user.id }, transaction });
        await user.destroy({ transaction });
    });

    // Remove stored face data too (ignore if the AI service is off)
    ai.deleteFaces(user.id).catch(() => {});

    res.json({ message: "Utilisateur supprimé" });
});


// =====================================================
// FACE PHOTOS (for the door cameras)
// =====================================================

// { "3": 2, "5": 1 } = user id -> number of photos registered
router.get("/faces", async (req, res) => {
    res.json(await ai.listFaces());
});

// body: { image: "data:image/jpeg;base64,..." } — a clear photo of the person's face
router.post("/users/:id/face", async (req, res) => {

    const user = await User.findByPk(req.params.id);

    if (!user) throw new HttpError(404, "Utilisateur introuvable");
    if (!req.body || !req.body.image) throw new HttpError(400, "Photo manquante");

    const result = await ai.enrollFace(user.id, req.body.image);

    res.json({
        message: "Photo enregistrée pour la reconnaissance faciale",
        photos: result.photos
    });
});

router.delete("/users/:id/face", async (req, res) => {

    await ai.deleteFaces(req.params.id);

    res.json({ message: "Photos supprimées" });
});


// =====================================================
// GROUPS, COURSES, CLASSROOMS, DEVICES — simple CRUD
// =====================================================

function crud(path, Model, options) {

    const { fields, required, label, feminine = false, include = [], order = [["name", "ASC"]], beforeCreate, canDelete } = options;
    const e = feminine ? "e" : "";

    const pick = body => {
        const data = {};
        for (const field of fields) {
            if (body[field] !== undefined) data[field] = body[field] === "" ? null : body[field];
        }
        return data;
    };

    const checkRequired = data => {
        for (const field of required) {
            if (data[field] === undefined || data[field] === null || String(data[field]).trim() === "") {
                throw new HttpError(400, "Veuillez remplir tous les champs obligatoires");
            }
        }
    };

    router.get(`/${path}`, async (req, res) => {
        res.json(await Model.findAll({ include, order }));
    });

    router.post(`/${path}`, async (req, res) => {
        const data = pick(req.body || {});
        checkRequired(data);
        if (beforeCreate) beforeCreate(data);

        const item = await Model.create(data);

        res.status(201).json({
            message: `${label} ajouté${e}`,
            item: await Model.findByPk(item.id, { include })
        });
    });

    router.put(`/${path}/:id`, async (req, res) => {
        const item = await Model.findByPk(req.params.id);
        if (!item) throw new HttpError(404, `${label} introuvable`);

        const data = { ...item.toJSON(), ...pick(req.body || {}) };
        checkRequired(data);

        await item.update(pick(req.body || {}));

        res.json({
            message: `${label} modifié${e}`,
            item: await Model.findByPk(item.id, { include })
        });
    });

    router.delete(`/${path}/:id`, async (req, res) => {
        const item = await Model.findByPk(req.params.id);
        if (!item) throw new HttpError(404, `${label} introuvable`);

        if (canDelete) await canDelete(item);

        await item.destroy();

        res.json({ message: `${label} supprimé${e}` });
    });
}


async function refuseIfUsed(checks) {
    for (const [count, message] of checks) {
        if (await count > 0) throw new HttpError(409, message);
    }
}


crud("groups", Group, {
    label: "Groupe",
    fields: ["name", "year", "department"],
    required: ["name", "year", "department"],
    canDelete: group => refuseIfUsed([
        [Student.count({ where: { group_id: group.id } }), "Ce groupe contient encore des étudiants"],
        [Schedule.count({ where: { group_id: group.id } }), "Ce groupe a encore des cours dans l'emploi du temps"],
        [Note.count({ where: { group_id: group.id } }), "Ce groupe a encore des notes d'enseignants"]
    ])
});

crud("courses", Course, {
    label: "Matière",
    feminine: true,
    fields: ["name", "description"],
    required: ["name"],
    canDelete: course => refuseIfUsed([
        [Schedule.count({ where: { course_id: course.id } }), "Cette matière est encore dans l'emploi du temps"],
        [Note.count({ where: { course_id: course.id } }), "Cette matière a encore des notes d'enseignants"]
    ])
});

crud("classrooms", Classroom, {
    label: "Salle",
    feminine: true,
    fields: ["name", "capacity", "building"],
    required: ["name", "capacity"],
    canDelete: classroom => refuseIfUsed([
        [Schedule.count({ where: { classroom_id: classroom.id } }), "Cette salle est encore dans l'emploi du temps"],
        [Device.count({ where: { classroom_id: classroom.id } }), "Un boîtier caméra est encore installé dans cette salle"]
    ])
});

crud("devices", Device, {
    label: "Boîtier",
    fields: ["name", "classroom_id", "active"],
    required: ["name", "classroom_id"],
    include: [Classroom],
    beforeCreate: data => {
        data.api_key = crypto.randomBytes(24).toString("hex");
    }
});

// New secret key for a box (e.g. if the old one leaked)
router.post("/devices/:id/regenerate-key", async (req, res) => {

    const device = await Device.findByPk(req.params.id, { include: [Classroom] });

    if (!device) throw new HttpError(404, "Boîtier introuvable");

    device.api_key = crypto.randomBytes(24).toString("hex");
    await device.save();

    res.json({ message: "Nouvelle clé générée", item: device });
});


module.exports = router;
