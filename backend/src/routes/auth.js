const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { User, Student, Teacher, Group } = require("../models");
const authMiddleware = require("../middleware/auth");


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
