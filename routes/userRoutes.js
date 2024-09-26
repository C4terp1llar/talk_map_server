const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/getUserMainInfo',authMiddleware, userController.getMainUserInfo);


module.exports = router;