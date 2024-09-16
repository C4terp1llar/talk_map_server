require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const registrationRoutes = require('./routes/registrationRoutes');

const server = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://talkmap.netlify.app',
];

server.use(express.json());
server.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
server.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        sameSite: 'lax',
        httpOnly: true,
    }
}));
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
server.use('/api', registrationRoutes)

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('БД подключена'))
    .catch(err => console.log(err));


const PORT = process.env.PORT || 5000;
server.listen(PORT,  '0.0.0.0',(e) => {
    e ? console.error(e.message) : console.log(`Работает на http://localhost:${process.env.PORT}`)
})


