const express = require("express");

const app = express();

const testRoutes = require("./routes/test");
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");
const scheduleRoutes = require("./routes/schedules");

app.use(express.json());

app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/schedules", scheduleRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Bouebdelli Smart Uni API running"
    });
});

module.exports = app;
