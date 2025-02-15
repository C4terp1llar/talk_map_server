const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const mediaController = require('../controllers/mediaController');
const cmController = require('../controllers/cmController');

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
router.post('/getOneFriend', authMiddleware, userController.getOneFriend);

router.get('/friend',authMiddleware, userController.getFriendsPg);

router.get('/sessions',authMiddleware, userController.getActiveSessions);
router.get('/sessions/:id',authMiddleware, userController.getSession);
router.delete('/sessions/:id',authMiddleware, userController.deleteSession);

router.get('/pass',authMiddleware, userController.checkPassword);
router.put('/pass',authMiddleware, userController.changePassword);

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
router.get('/photo/g',authMiddleware, mediaController.getPhotoGList);
router.get('/photo/:id',authMiddleware, mediaController.getPhoto);
router.delete('/photo',authMiddleware, mediaController.deletePhoto);

router.post('/reaction', authMiddleware, mediaController.reactionAction);

router.post('/message', authMiddleware, cmController.createMessage);
router.get('/message', authMiddleware, cmController.getConversationMessages);

router.get('/group/check', authMiddleware, cmController.checkGroup);
router.post('/group', authMiddleware, cmController.createGroup);

router.get('/conv', authMiddleware, cmController.getConversations);
router.get('/conv/:id', authMiddleware, cmController.getConversationInfo);
router.get('/conv/:id/members', authMiddleware, cmController.getGroupConvMembers);

router.get('/conv/new/:uid', authMiddleware, cmController.getNewConvOpponent);


module.exports = router;