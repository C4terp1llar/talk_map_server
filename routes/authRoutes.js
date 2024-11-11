const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', AuthController.login);
router.get('/refresh', AuthController.refresh);

router.get('/sync', authMiddleware, AuthController.sync);
router.get('/logout', authMiddleware, AuthController.logout);


module.exports = router;