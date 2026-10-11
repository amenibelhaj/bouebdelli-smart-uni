const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");
const scheduleRoutes = require("./routes/schedules");
const noteRoutes = require("./routes/notes");
const adminRoutes = require("./routes/admin");


app.use(cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim())
}));

// 15 MB: files and photos are sent as base64 inside JSON
app.use(express.json({ limit: "15mb" }));


app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Bouebdelli Smart Uni API running"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/admin", adminRoutes);


app.use("/api", (req, res) => {
    res.status(404).json({ message: "Route introuvable" });
});


// Errors thrown in any route end up here (Express 5 catches async errors)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {

    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Fichier trop volumineux" });
    }

    if (err.type) {
        return res.status(400).json({ message: "Requête invalide" });
    }

    if (err.status && (err.status < 500 || err.status === 502 || err.status === 503)) {
        return res.status(err.status).json({ message: err.message });
    }

    if (err.name === "SequelizeUniqueConstraintError") {
        const field = err.errors && err.errors[0] ? err.errors[0].path : "";
        const messages = {
            email: "Cet email est déjà utilisé",
            student_number: "Ce numéro d'inscription est déjà utilisé"
        };
        return res.status(409).json({ message: messages[field] || "Cette valeur existe déjà" });
    }

    if (err.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
            message: "Opération impossible : cet élément est lié à d'autres données"
        });
    }

    if (err.name === "SequelizeValidationError" || err.name === "SequelizeDatabaseError") {
        return res.status(400).json({ message: "Données invalides" });
    }

    console.error(err);

    res.status(500).json({ message: "Erreur interne du serveur" });
});


module.exports = app;
