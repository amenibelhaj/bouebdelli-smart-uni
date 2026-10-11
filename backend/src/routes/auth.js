const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { User, Student, Teacher, Group } = require("../models");
const authMiddleware = require("../middleware/auth");
const ai = require("../services/faces");


// =========================
// LOGIN
// =========================

router.post("/login", async (req, res) => {

    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({
            message: "Email et mot de passe requis"
        });
    }

    const user = await User.findOne({
        where: { email: String(email).trim().toLowerCase() }
    });

    // Same message for unknown email and wrong password,
    // so nobody can find out which emails exist
    const passwordMatch = user
        ? await bcrypt.compare(String(password), user.password)
        : false;

    if (!user || !passwordMatch) {
        return res.status(401).json({
            message: "Email ou mot de passe incorrect"
        });
    }

    if (user.status !== "active") {
        return res.status(403).json({
            message: "Votre compte n'est pas encore activé par l'administration"
        });
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    res.json({
        message: "Connexion réussie",
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });

});


// =========================
// CURRENT USER (with student / teacher profile)
// =========================

router.get("/me", authMiddleware, async (req, res) => {

    const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ["password"] },
        include: [
            { model: Student, include: [Group] },
            { model: Teacher }
        ]
    });

    if (!user || user.status !== "active") {
        return res.status(401).json({
            message: "Compte introuvable ou désactivé"
        });
    }

    res.json(user);

});


// =========================
// CHANGE OWN PASSWORD
// =========================

// =========================
// MY FACE (students and teachers register their own face once)
// After SELF_PHOTOS photos, only the admin can change it,
// so nobody can add a friend's face to their account later.
// =========================

const SELF_PHOTOS = 3;

router.get("/face", authMiddleware, async (req, res) => {

    if (!["student", "teacher"].includes(req.user.role)) {
        return res.json({ available: true, photos: 0, needed: 0, can_add: false });
    }

    try {
        const faces = await ai.listFaces();
        const photos = faces[String(req.user.id)] || 0;

        res.json({
            available: true,
            photos,
            needed: SELF_PHOTOS,
            can_add: photos < SELF_PHOTOS
        });
    } catch (error) {
        // Face service off: the site keeps working, the face page just waits
        res.json({ available: false, photos: null, needed: SELF_PHOTOS, can_add: false });
    }
});

router.post("/face", authMiddleware, async (req, res) => {

    if (!["student", "teacher"].includes(req.user.role)) {
        return res.status(403).json({ message: "Réservé aux étudiants et aux enseignants" });
    }

    if (!req.body || !req.body.image) {
        return res.status(400).json({ message: "Photo manquante" });
    }

    const faces = await ai.listFaces();
    const photos = faces[String(req.user.id)] || 0;

    if (photos >= SELF_PHOTOS) {
        return res.status(403).json({
            message: "Votre visage est déjà enregistré. Pour le modifier, contactez l'administration."
        });
    }

    const result = await ai.enrollFace(req.user.id, req.body.image);

    res.json({
        message: `Photo ${result.photos} sur ${SELF_PHOTOS} enregistrée`,
        photos: result.photos,
        needed: SELF_PHOTOS,
        can_add: result.photos < SELF_PHOTOS
    });
});


router.put("/password", authMiddleware, async (req, res) => {

    const { current_password, new_password } = req.body || {};

    if (!new_password || String(new_password).length < 6) {
        return res.status(400).json({
            message: "Le nouveau mot de passe doit contenir au moins 6 caractères"
        });
    }

    const user = await User.findByPk(req.user.id);

    if (!user || !(await bcrypt.compare(String(current_password || ""), user.password))) {
        return res.status(400).json({
            message: "Mot de passe actuel incorrect"
        });
    }

    user.password = await bcrypt.hash(String(new_password), 10);
    await user.save();

    res.json({ message: "Mot de passe modifié" });

});


module.exports = router;
