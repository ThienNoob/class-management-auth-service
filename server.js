import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();
const salt = 10;
const app = express();
app.use(express.json());
app.use(cors({
    origin: process.env.BASE_URL_FE,
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(cookieParser());
const port = process.env.AUTH_SERVICE_PORT || 3077;
const db = mysql.createConnection({
    host: process.env.AUTH_SERVICE_HOST,
    user: process.env.AUTH_SERVICE_USER,
    password: process.env.AUTH_SERVICE_PASSWORD,
    database: process.env.AUTH_SERVICE_DATABASE
});

db.connect((err) => {
    if (err) {
        console.log("Error in connecting to MySQL" + err);
    } else {
        console.log("Connected to MySQL");
    }
})

app.post('/register', (req, res) => {
    const checkEmailQuery = "SELECT * FROM auth WHERE email = (?)";

    db.query(checkEmailQuery, [req.body.email], (err, data) => {
        if (err) return res.json({Error: "Error for checking email"});
        if (data.length > 0) return res.json({Error: "Email already exists"});

        const sql = "INSERT INTO auth (`email`,`password`) VALUES (?)";
        bcrypt.hash(req.body.password.toString(), salt, (err, hash) => {
            if (err) return res.json({Error: "Error for hashing password"});
            const data = [
                req.body.email,
                hash
            ]
            db.query(sql, [data], (err, result) => {
                if (err) return res.json({Error: "Error for inserting data"});
                return res.json({Status: "Success"});
            })
        })
    });
})

app.post('/login', (req, res) => {
    const sql = "SELECT * FROM auth WHERE email = (?)";
    db.query(sql, [req.body.email], (err, data) => {
        if (err) return res.json({Error: "Login failed"});
        if (data.length > 0) {
            bcrypt.compare(req.body.password.toString(), data[0].password, (err, result) => {
                if (err) return res.json({Error: "Error for comparing password"});
                if (result) {
                    const user = {
                        email: data[0].email
                    }
                    const token = jwt.sign(user, "jwt-secret-key", {expiresIn: "1d"});
                    // res.cookie('jwt', accessToken, {httpOnly: true});
                    res.cookie('token', token);
                    return res.json({Status: "Success"});
                } else {
                    return res.json({Error: "Invalid password"});
                }
            })
        } else {
            return res.json({Error: "Invalid email"});
        }
    })
})

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.json({Error: "Access denied"});
    else {
        jwt.verify(token, "jwt-secret-key", (err, decoded) => {
            if (err) return res.json({Error: "Invalid token"});
            else {
                req.user = decoded;
                next();
            }
        })
    }
}

app.get('/', verifyUser, (req, res) => {
    return res.json({Status: "Success", user: req.user});
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({Status: "Success"});
});

app.listen(port, () => {
    console.log("Running...");
})
