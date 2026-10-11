const express = require("express");
const router = express.Router();

const {
    User,
    Schedule,
    Attendance,
    Course,
    Teacher,
    Classroom,
    Group
} = require("../models");


router.get("/users", async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


router.get("/schedules", async (req, res) => {
    try {
        const schedules = await Schedule.findAll({
            include: [
                Course,
                {
                    model: Teacher,
                    include: [User]
                },
                Classroom,
                Group
            ]
        });

        res.json(schedules);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


router.get("/attendance", async (req, res) => {
    try {
        const attendance = await Attendance.findAll({
            include: [
                {
                    model: User
                },
                {
                    model: Schedule,
                    include: [
                        Course,
                        Classroom,
                        Group
                    ]
                }
            ]
        });

        res.json(attendance);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


module.exports = router;
