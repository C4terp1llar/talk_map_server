const userService = require('../services/userService')
const ImgService = require('../services/imgService')
const wsServer = require('../utils/wsServer')

class UserController {
    async getMainUserInfo (req, res) {
        try{
            const uid = req.user.uid

            const [mainInfo, addressInfo] = await Promise.all([
                userService.getUserInfo(uid),
                userService.getUserAddress(uid)
            ]);

            res.status(200).json({main: mainInfo, address: addressInfo});
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка получении информации о пользователе'});
        }
    }

    async setUserWallpaper (req, res) {
        const { croppedImg, originalImg, force } = req.body;

        if (!croppedImg || !force || (force !== 'uploadCrop' && force !== 'onlyCrop') || (force === 'uploadCrop' && !originalImg)) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid

            if (force === 'uploadCrop'){
                const {public_id, asset_id, asset_url, path} = await ImgService.uploadImg(originalImg, uid, 'originalWallpaper')
                await userService.createWallpaper(uid, public_id, asset_id, asset_url, path, 'uploadCrop');
            }

            const {public_id, asset_id, asset_url, path} = await ImgService.uploadImg(croppedImg, uid, 'wallpaper')
            await userService.createWallpaper(uid, public_id, asset_id, asset_url, path, 'onlyCrop');

            res.status(200).json(asset_url);
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при загрузке обоев'});
        }
    }

    async setUserAvatar (req, res) {
        const { croppedImg, originalImg, force } = req.body;

        if (!croppedImg || !force || (force !== 'uploadCrop' && force !== 'onlyCrop') || (force === 'uploadCrop' && !originalImg)) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid

            if (force === 'uploadCrop'){
                const {public_id, asset_id, asset_url, path} = await ImgService.uploadImg(originalImg, uid, 'originalAvatar')
                await userService.createAvatar(uid, public_id, asset_id, asset_url, path, 'uploadCrop');
            }

            const {public_id, asset_id, asset_url, path} = await ImgService.uploadImg(croppedImg, uid, 'avatar')
            await userService.createAvatar(uid, public_id, asset_id, asset_url, path, 'onlyCrop');

            res.status(200).json(asset_url);
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при загрузке аватара'});
        }
    }

    async getOriginalWallpaper (req, res) {
        try{
            const uid = req.user.uid

            const {asset_url} = await userService.getOriginalWallpaper(uid)

            if (!asset_url) {
                return res.status(404).json({ error: 'Оригинальные обои не найдены' });
            }

            const data = await userService.convertUrlToBase64(asset_url)

            res.status(200).json(data);
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при получении оригинальных обоев'});
        }
    }

    async getOriginalAvatar (req, res) {
        try{
            const uid = req.user.uid

            const {asset_url} = await userService.getOriginalAvatar(uid)

            if (!asset_url) {
                return res.status(404).json({ error: 'Оригинальный аватар не найден' });
            }

            const data = await userService.convertUrlToBase64(asset_url)

            res.status(200).json(data);
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при получении оригинального аватара'});
        }
    }

    async deleteUserWallpaper (req, res) {
        try{
            const uid = req.user.uid

            const {public_id: wallpaper} = await userService.getUserWallpaper(uid)
            const {public_id: wallpaperOrig} = await userService.getOriginalWallpaper(uid)

            await Promise.all([
                ImgService.deleteImg([wallpaper, wallpaperOrig]),
                userService.deleteAllWallpaper(uid)
            ])

            res.status(200).json({message: 'ok'});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при удалении обоев'});
        }
    }

    async changeUserNickname (req, res) {
        const { nickname } = req.body;

        if (!nickname) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid
            await userService.changeNickname(uid, nickname);
            res.status(200).json({message: 'ok'});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при изменении никнейма'});
        }
    }

    async changeUserNicknameColor (req, res) {
        const { color } = req.body;

        if (!color) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid
            await userService.changeNicknameColor(uid, color);
            res.status(200).json({message: 'ok'});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при изменении цвета никнейма'});
        }
    }

    async changeUserAddress (req, res) {
        const { address } = req.body;

        if (!address) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid
            await userService.changeAddress(uid, address)
            const newAddress = await userService.getUserAddress(uid)
            res.status(200).json({address: newAddress});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при изменении адреса пользователя'});
        }
    }

    async setUserTag (req, res) {
        const { text, emoji } = req.body;

        if (!text || !emoji) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid
            await userService.setUserTag(uid, emoji, text);
            const tagsArr = await userService.getUserTags(uid);
            res.status(200).json({tagsArr});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при добавлении тега'});
        }
    }

    async deleteUserTag (req, res) {
        const { deleteTagText } = req.body;

        if (!deleteTagText) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const uid = req.user.uid
            await userService.deleteUserTag(uid, deleteTagText);
            const tagsArr= await userService.getUserTags(uid);
            res.status(200).json({tagsArr});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при удалении тега'});
        }
    }

    async findUsers (req, res) {
        const { cityFilter, minAgeFilter, maxAgeFilter, genderFilter, nicknameFilter, page = 1, limit = 10 } = req.body;

        try{
            const requesterUid = req.user.uid
            const {users, hasMore} = await userService.findUsers(cityFilter, minAgeFilter, maxAgeFilter, genderFilter, nicknameFilter, requesterUid, page, limit, true);
            res.status(200).json({users, hasMore});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при поиске пользователей'});
        }
    }

    async isUserExist (req, res) {
        const { uid } = req.body;

        if (!uid) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const isExist = await userService.isUserExists(uid);
            res.status(200).json({isExist});
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка получении информации о стороннем пользователе'});
        }
    }

    async getMainExternalUserInfo(req, res) {
        const { uid } = req.body;

        if (!uid) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const currentUserId = req.user.uid;

            const [mainInfo, addressInfo, isIncoming, isOutgoing, isFriendship] = await Promise.all([
                userService.getUserInfo(uid, 'external'),
                userService.getUserAddress(uid, 'external'),
                userService.isIncomingFriendReq(currentUserId, uid, currentUserId),
                userService.isOutgoingFriendReq(currentUserId, currentUserId, uid),
                userService.isFriendshipExists(currentUserId, uid),
            ]);

            if (!mainInfo || !addressInfo) {
                return res.status(400).json({ message: 'Пользователь не существует' });
            }

            res.status(200).json({ main: mainInfo, address: addressInfo, isIncoming, isOutgoing, isFriendship });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка получении информации о стороннем пользователе' });
        }
    }

    async sendFriendRequest(req, res) {
        const { recipient_id } = req.body;

        if (!recipient_id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const sender_id = req.user.uid;

            const isRecipientExist = await userService.isUserExists(recipient_id);

            if (!isRecipientExist) {
                return res.status(400).json({ message: 'Пользователь не существует' });
            }

            const isReverseReqExist = await userService.isFriendReqExist(recipient_id, recipient_id, sender_id)

            if (isReverseReqExist){
                await userService.createFriendship(recipient_id, sender_id);
                await userService.deleteFriendReq(recipient_id, recipient_id, sender_id);
                wsServer.emitToUser(sender_id, 'submit_friend_request', {recipient_id})
                return res.status(200).json({ message: 'Заявка в друзья подтверждена' });
            }

            await userService.createFriendReq(sender_id, sender_id, recipient_id);

            const wsFriendRequestSnap = await userService.getOneFriendReqDetailed(sender_id, sender_id, recipient_id)
            wsServer.emitToUser(recipient_id, 'receive_friend_request', {wsFriendRequestSnap})

            return res.status(200).json({ message: 'ok' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при отправке заявки в друзья' });
        }
    }

    async cancelFriendRequest(req, res) {
        const { recipient_id } = req.body;

        if (!recipient_id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const sender_id = req.user.uid;

            const isRecipientExist = await userService.isUserExists(recipient_id);

            if (!isRecipientExist) {
                return res.status(400).json({ message: 'Пользователь не существует' });
            }

            const wsFriendRequestSnap = await userService.getOneFriendReqDetailed(sender_id, sender_id, recipient_id)

            await userService.deleteFriendReq(sender_id, sender_id, recipient_id);

            wsServer.emitToUser(recipient_id, 'abort_friend_request', {wsFriendRequestSnap})

            return res.status(200).json({ message: 'ok' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при отмене заявки в друзья' });
        }
    }

    async declineFriendRequest(req, res) {
        const { sender_id } = req.body;

        if (!sender_id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const recipient_id = req.user.uid;

            const isSenderExist = await userService.isUserExists(sender_id);

            if (!isSenderExist) {
                return res.status(400).json({ message: 'Пользователь не существует' });
            }

            const wsFriendRequestSnap = await userService.getOneFriendReqDetailed(sender_id, sender_id, recipient_id)

            await userService.deleteFriendReq(sender_id, sender_id, recipient_id);

            wsServer.emitToUser(sender_id, 'decline_friend_request', {wsFriendRequestSnap})

            return res.status(200).json({ message: 'ok' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при отклонении заявки в друзья' });
        }
    }

    async submitFriendReq(req, res) {
        const { sender_id } = req.body;

        if (!sender_id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const recipient_id = req.user.uid;

            const isSenderExist = await userService.isUserExists(recipient_id);

            if (!isSenderExist) {
                return res.status(400).json({ message: 'Пользователь не существует' });
            }


            await userService.createFriendship(sender_id, recipient_id);

            const wsFriendRequestSnap = await userService.getOneFriendReqDetailed(sender_id, sender_id, recipient_id)

            await userService.deleteFriendReq(sender_id, sender_id, recipient_id);

            wsServer.emitToUser(sender_id, 'submit_friend_request', {wsFriendRequestSnap})

            return res.status(200).json({ message: 'Заявка в друзья подтверждена' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при создании дружбы' });
        }
    }

    async deleteFriendship(req, res) {
        const { recipient_id } = req.body;

        if (!recipient_id) return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const sender_id = req.user.uid;

            await userService.deleteFriendship(sender_id, recipient_id)

            wsServer.emitToUser(recipient_id, 'delete_friendship', {sender_id})

            return res.status(200).json({ message: 'ok' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при удалении заявки в друзья' });
        }
    }

    async getFriendReqs(req, res) {
        const { mode, page = 1, limit = 10  } = req.body;

        if (mode !== 'incoming' && mode !== 'outgoing') return res.status(400).json({ error: 'Нехватает данных или данные некорректны' });

        try {
            const uid = req.user.uid;

            const isUserExist = await userService.isUserExists(uid);

            if (!isUserExist) {
                return res.status(400).json({ message: 'Пользователь не существует' });
            }

            const {friendRequests, hasMore} = await userService.getFriendReqsDetailed(uid, mode, page, limit);

            return res.status(200).json({ requests: friendRequests, hasMore: hasMore });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка при получении заявок в друзья"});
        }
    }


}

module.exports = new UserController()