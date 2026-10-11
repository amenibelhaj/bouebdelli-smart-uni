// Load .env before anything else reads process.env
require("dotenv").config();

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing. Copy .env.example to .env and fill it in.");
    process.exit(1);
}

const app = require("./app");
const { sequelize } = require("./models");
const { startAbsenceJob } = require("./services/attendance");

const PORT = process.env.PORT || 5000;


async function startServer() {

    try {

        await sequelize.authenticate();
        console.log("Database connected successfully");

        // Creates missing tables (does not change existing ones)
        await sequelize.sync();
        console.log("Database synchronized");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Every minute: mark absent everyone who missed a class that has ended
        startAbsenceJob();

    } catch (error) {

        console.error("Database connection failed:", error.message);
        process.exit(1);

    }
}

startServer();
