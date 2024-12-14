const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const mediaController = require('../controllers/mediaController');

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
router.get('/friendsReqsAmount',authMiddleware, userController.getFriendsReqsAmount);
router.post('/sendFriendRequest',authMiddleware, userController.sendFriendRequest);
router.post('/cancelFriendRequest',authMiddleware, userController.cancelFriendRequest);
router.post('/declineFriendRequest',authMiddleware, userController.declineFriendRequest);
router.post('/submitFriendRequest',authMiddleware, userController.submitFriendReq);
router.post('/deleteFriendship',authMiddleware, userController.deleteFriendship);
router.post('/getFriendReqs',authMiddleware, userController.getFriendReqs);
router.post('/getMutualFriends',authMiddleware, userController.getMutualFriends);
router.post('/getOneFriend',authMiddleware, userController.getOneFriend);

router.post('/uploadMedia',authMiddleware, mediaController.createPhoto);

router.post('/photo',authMiddleware, mediaController.createPhoto);
router.get('/photo',authMiddleware, mediaController.getPhotos);
router.get('/photo/:id',authMiddleware, mediaController.getPhotos);
router.delete('/photo',authMiddleware, mediaController.deletePhoto);

router.get('/gMedia',authMiddleware, mediaController.isPhotoExists);


module.exports = router;