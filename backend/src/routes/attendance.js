const express = require("express");
const router = express.Router();

const {
    Attendance,
    User,
    Schedule,
    Course,
    Classroom,
    Group,
    Teacher
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");


// =========================
// Camera check-in
// =========================

router.post(
    "/check-in",
    authMiddleware,
    async (req, res) => {

        try {

            const {
                user_id,
                schedule_id,
                confidence
            } = req.body;


            const today = new Date().toISOString().split("T")[0];


            const existingAttendance = await Attendance.findOne({
                where: {
                    user_id,
                    schedule_id,
                    date: today
                }
            });


            if (existingAttendance) {
                return res.status(400).json({
                    message: "Attendance already recorded"
                });
            }


            const attendance = await Attendance.create({
                user_id,
                schedule_id,
                date: today,
                status: "present",
                confidence
            });


            res.status(201).json({
                message: "Attendance recorded",
                attendance
            });


        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


// =========================
// ADMIN: Get all attendance
// =========================

router.get(
    "/all",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const attendance = await Attendance.findAll({

                include: [
                    {
                        model: User,
                        attributes: {
                            exclude: ["password"]
                        }
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

    }
);


// =========================
// STUDENT: Get own attendance
// =========================

router.get(
    "/my",
    authMiddleware,
    roleMiddleware("student"),
    async (req, res) => {

        try {

            const attendance = await Attendance.findAll({

                where: {
                    user_id: req.user.id
                },

                include: [
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

    }
);


// =========================
// TEACHER: Get attendance of own classes
// =========================

router.get(
    "/teacher",
    authMiddleware,
    roleMiddleware("teacher"),
    async (req, res) => {

        try {

            const teacher = await Teacher.findOne({
                where: {
                    user_id: req.user.id
                }
            });


            if (!teacher) {
                return res.status(404).json({
                    message: "Teacher profile not found"
                });
            }


            const attendance = await Attendance.findAll({

                include: [
                    {
                        model: User,
                        where: {
                            role: "student"
                        },
                        attributes: {
                            exclude: ["password"]
                        }
                    },
                    {
                        model: Schedule,
                        required: true,
                        where: {
                            teacher_id: teacher.id
                        },
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

    }
);


module.exports = router;