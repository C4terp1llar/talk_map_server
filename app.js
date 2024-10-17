require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require("http");

const WsServer = require('./utils/wsServer')

const registrationRoutes = require('./routes/registrationRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://talkmap.netlify.app',
];

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// роуты
app.use('/api/reg', registrationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// подключение к монго
mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('БД подключена'))
    .catch(err => console.log(err));


// ws сервер на io
const httpServer = createServer(app);

WsServer.initializeSocketServer(httpServer, allowedOrigins)

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', (e) => {
    if (e) {
        console.error(e.message);
    } else {
        console.log(`Сервер работает`);
    }
});