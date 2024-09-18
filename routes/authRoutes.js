const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);

router.get('/sync', authMiddleware, AuthController.sync);

router.post('/test', authMiddleware, AuthController.test);

module.exports = router;