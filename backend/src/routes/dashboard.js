const express = require("express");
const router = express.Router();

const {
    User,
    Student,
    Teacher,
    Attendance,
    Schedule,
    Course,
    Classroom,
    Group
} = require("../models");

const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role");


// =====================================================
// STUDENT DASHBOARD
// =====================================================

router.get(
    "/student",
    authMiddleware,
    roleMiddleware("student"),
    async (req, res) => {

        try {

            const student = await Student.findOne({

                where: {
                    user_id: req.user.id
                },

                include: [
                    {
                        model: User,
                        attributes: {
                            exclude: ["password"]
                        }
                    },
                    {
                        model: Group
                    }
                ]

            });


            if (!student) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }


            const attendance = await Attendance.findAll({

                where: {
                    user_id: req.user.id
                }

            });


            const schedules = await Schedule.findAll({

                where: {
                    group_id: student.group_id
                },

                include: [
                    Course,
                    Classroom
                ]

            });


            const present = attendance.filter(
                item => item.status === "present"
            ).length;


            const absent = attendance.filter(
                item => item.status === "absent"
            ).length;


            res.json({

                student: student.User,

                group: student.Group,

                attendance: {
                    present,
                    absent
                },

                schedules

            });


        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);



// =====================================================
// TEACHER DASHBOARD
// =====================================================

router.get(
    "/teacher",
    authMiddleware,
    roleMiddleware("teacher"),
    async (req, res) => {

        try {

            const teacher = await Teacher.findOne({

                where: {
                    user_id: req.user.id
                },

                include: [
                    {
                        model: User,
                        attributes: {
                            exclude: ["password"]
                        }
                    }
                ]

            });


            if (!teacher) {
                return res.status(404).json({
                    message: "Teacher not found"
                });
            }


            const schedules = await Schedule.findAll({

                where: {
                    teacher_id: teacher.id
                },

                include: [
                    Course,
                    Classroom,
                    Group
                ]

            });


            res.json({

                teacher: teacher.User,

                speciality: teacher.speciality,

                department: teacher.department,

                schedules,

                statistics: {
                    totalClasses: schedules.length
                }

            });


        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);



// =====================================================
// ADMIN DASHBOARD
// =====================================================

router.get(
    "/admin",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {


            const students = await User.count({

                where: {
                    role: "student"
                }

            });


            const teachers = await User.count({

                where: {
                    role: "teacher"
                }

            });


            const courses = await Course.count();


            const classrooms = await Classroom.count();


            const groups = await Group.count();


            const todayAttendance = await Attendance.count({

                where: {
                    date: new Date()
                }

            });



            res.json({

                statistics: {

                    students,

                    teachers,

                    courses,

                    classrooms,

                    groups,

                    todayAttendance

                }

            });



        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);



module.exports = router;