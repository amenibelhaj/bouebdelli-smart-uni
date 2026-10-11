const express = require("express");
const router = express.Router();

const {
    Schedule,
    Course,
    Teacher,
    Classroom,
    Group
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");


// =========================
// GET ALL SCHEDULES
// Admin
// =========================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const schedules = await Schedule.findAll({

                include: [
                    Course,
                    Classroom,
                    Group,
                    Teacher
                ]

            });


            res.json(schedules);


        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);



// =========================
// CREATE SCHEDULE
// Admin
// =========================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const {
                group_id,
                course_id,
                teacher_id,
                classroom_id,
                day,
                start_time,
                end_time
            } = req.body;



            const schedule = await Schedule.create({

                group_id,
                course_id,
                teacher_id,
                classroom_id,
                day,
                start_time,
                end_time

            });



            res.status(201).json({

                message: "Schedule created",

                schedule

            });



        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);



// =========================
// UPDATE SCHEDULE
// Admin
// =========================

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {


            const schedule = await Schedule.findByPk(
                req.params.id
            );


            if (!schedule) {

                return res.status(404).json({

                    message: "Schedule not found"

                });

            }



            await schedule.update(req.body);



            res.json({

                message: "Schedule updated",

                schedule

            });



        } catch (error) {

            res.status(500).json({

                error: error.message

            });

        }

    }
);



// =========================
// DELETE SCHEDULE
// Admin
// =========================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {


            const schedule = await Schedule.findByPk(
                req.params.id
            );


            if (!schedule) {

                return res.status(404).json({

                    message: "Schedule not found"

                });

            }



            await schedule.destroy();



            res.json({

                message: "Schedule deleted"

            });



        } catch (error) {

            res.status(500).json({

                error: error.message

            });

        }

    }
);



module.exports = router;
