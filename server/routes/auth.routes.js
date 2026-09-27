const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDatabase, saveDatabase } = require("../data/database");

const router = express.Router();

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

/* REGISTER */

router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            phone = "",
            password,
            role = "USER"
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "Name, email and password are required"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        if (!["USER", "OWNER"].includes(role)) {
            return res.status(400).json({
                success: false,
                error: "Invalid registration role"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must contain at least 6 characters"
            });
        }

        const db = await getDatabase();

        const existing = db.exec(
            `SELECT id FROM users WHERE email = ?`,
            [cleanEmail]
        );

        if (existing.length && existing[0].values.length) {
            return res.status(409).json({
                success: false,
                error: "An account with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        db.run(
            `INSERT INTO users
            (name,email,phone,password,role)
            VALUES (?,?,?,?,?)`,
            [
                name.trim(),
                cleanEmail,
                phone.trim(),
                hashedPassword,
                role
            ]
        );

        saveDatabase();

        const result = db.exec(
            `SELECT id,name,email,phone,role,verified,created_at
             FROM users
             WHERE email = ?`,
            [cleanEmail]
        );

        const user = {
            id: result[0].values[0][0],
            name: result[0].values[0][1],
            email: result[0].values[0][2],
            phone: result[0].values[0][3],
            role: result[0].values[0][4],
            verified: result[0].values[0][5],
            created_at: result[0].values[0][6]
        };

        const token = createToken(user);

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Registration failed"
        });
    }
});


/* LOGIN */

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required"
            });
        }

        const db = await getDatabase();

        const result = db.exec(
            `SELECT id,name,email,phone,password,role,verified,created_at
             FROM users
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        const row = result[0].values[0];

        const user = {
            id: row[0],
            name: row[1],
            email: row[2],
            phone: row[3],
            password: row[4],
            role: row[5],
            verified: row[6],
            created_at: row[7]
        };

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        delete user.password;

        const token = createToken(user);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            error: "Login failed"
        });
    }
});


/* CURRENT USER */

router.get("/me", async (req, res) => {
    try {
        const auth = req.headers.authorization;

        if (!auth || !auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const token = auth.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const db = await getDatabase();

        const result = db.exec(
            `SELECT id,name,email,phone,role,verified,created_at
             FROM users
             WHERE id = ?`,
            [decoded.id]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(401).json({
                success: false,
                error: "User not found"
            });
        }

        const row = result[0].values[0];

        res.json({
            success: true,
            user: {
                id: row[0],
                name: row[1],
                email: row[2],
                phone: row[3],
                role: row[4],
                verified: row[5],
                created_at: row[6]
            }
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }
});

module.exports = router;
