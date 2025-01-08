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

router.post('/post',authMiddleware, mediaController.createPost);
router.get('/post',authMiddleware, mediaController.getPosts);
router.get('/post/:id',authMiddleware, mediaController.getPost);
router.delete('/post/:id',authMiddleware, mediaController.deletePost);

router.post('/comment',authMiddleware, mediaController.createComment);
router.get('/comment',authMiddleware, mediaController.getComments);
router.delete('/comment/:id',authMiddleware, mediaController.deleteComment);
router.patch('/comment/:id',authMiddleware, mediaController.updateComment);

router.post('/photo',authMiddleware, mediaController.createPhoto);
router.get('/photo',authMiddleware, mediaController.getPhotos);
router.get('/photo/:id',authMiddleware, mediaController.getPhoto);
router.delete('/photo',authMiddleware, mediaController.deletePhoto);

router.get('/gPhoto',authMiddleware, mediaController.getPhotoGList);

router.post('/reaction', authMiddleware, mediaController.reactionAction);

module.exports = router;