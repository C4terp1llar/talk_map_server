const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/getUserMainInfo',authMiddleware, userController.getMainUserInfo);
router.post('/setWallpaper',authMiddleware, userController.setUserWallpaper);
router.post('/setAvatar',authMiddleware, userController.setUserAvatar);


module.exports = router;