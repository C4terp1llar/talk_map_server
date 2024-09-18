require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const registrationRoutes = require('./routes/registrationRoutes');
const authRoutes = require('./routes/authRoutes');

const server = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://talkmap.netlify.app',
];

server.use(express.json({ limit: '10mb' }));
server.use(express.urlencoded({ limit: '10mb', extended: true }));
server.use(cookieParser())
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
server.use('/api/reg', registrationRoutes);
server.use('/api/auth', authRoutes);

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('БД подключена'))
    .catch(err => console.log(err));


const PORT = process.env.PORT || 5000;
server.listen(PORT,  '0.0.0.0',(e) => {
    e ? console.error(e.message) : console.log(`Работает на http://localhost:${process.env.PORT}`)
})


