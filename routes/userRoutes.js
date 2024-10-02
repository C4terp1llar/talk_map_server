const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/getUserMainInfo',authMiddleware, userController.getMainUserInfo);
router.post('/setWallpaper',authMiddleware, userController.setUserWallpaper);
router.post('/setAvatar',authMiddleware, userController.setUserAvatar);
router.post('/getOriginalAvatar',authMiddleware, userController.getOriginalAvatar);
router.post('/getOriginalWallpaper',authMiddleware, userController.getOriginalWallpaper);
router.post('/deleteWallpaper',authMiddleware, userController.deleteUserWallpaper);

module.exports = router;