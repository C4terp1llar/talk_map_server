require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const registrationRoutes = require('./routes/registrationRoutes');

const server = express();

server.use(express.json());
server.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization'
}));
server.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false}
}));
server.use('/api', registrationRoutes)

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('БД подключена'))
    .catch(err => console.log(err));


const PORT = process.env.PORT || 5000;
server.listen(PORT, 'localhost', (e) => {
    e ? console.error(e.message) : console.log(`Работает на http://localhost:${process.env.PORT}`)
})


