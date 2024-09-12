require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const registrationRoutes = require('./routes/registrationRoutes');

const server = express();

server.use(express.json());
server.use(cors({
    origin: (origin, callback) => callback(null, true), // Разрешаем все домены
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Необходимо для отправки куков
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With'
}));
server.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: 'None',
        httpOnly: true,
        maxAge: 60000 * 24 * 60 * 60 * 1000,
        path: '/',
    }
}));
server.use('/api', registrationRoutes)

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('БД подключена'))
    .catch(err => console.log(err));


const PORT = process.env.PORT || 5000;
server.listen(PORT,  '0.0.0.0',(e) => {
    e ? console.error(e.message) : console.log(`Работает на http://localhost:${process.env.PORT}`)
})


