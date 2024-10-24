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
router.post('/changeNickname',authMiddleware, userController.changeUserNickname);
router.post('/changeNicknameColor',authMiddleware, userController.changeUserNicknameColor);
router.post('/changeAddress',authMiddleware, userController.changeUserAddress);
router.post('/setTag',authMiddleware, userController.setUserTag);
router.post('/deleteTag',authMiddleware, userController.deleteUserTag);

router.post('/isUserExist',authMiddleware, userController.isUserExist);
router.post('/findUsers',authMiddleware, userController.findUsers);
router.post('/getExternalUserMainInfo',authMiddleware, userController.getMainExternalUserInfo);


module.exports = router;