const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { User } = require("../models");


router.post("/login", async (req, res) => {

    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            where: { email }
        });


        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }


        if (user.status !== "active") {
            return res.status(403).json({
                message: "Account not active"
            });
        }


        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {
            return res.status(401).json({
                message: "Wrong password"
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
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        });


    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});


module.exports = router;
