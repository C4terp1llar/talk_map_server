const userService = require('../services/userService')
const ImgService = require('../services/imgService')

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
            const users = await userService.findUsers(cityFilter, minAgeFilter, maxAgeFilter, genderFilter, nicknameFilter, requesterUid, page, limit);
            res.status(200).json({users});
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

    async getMainExternalUserInfo (req, res) {
        const { uid } = req.body;

        if (!uid) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{

            const [mainInfo, addressInfo] = await Promise.all([
                userService.getUserInfo(uid, 'external'),
                userService.getUserAddress(uid, 'external')
            ]);

            if (!mainInfo || !addressInfo){
                return res.status(400).json({message: 'Пользователь не существует'});
            }

            res.status(200).json({main: mainInfo, address: addressInfo});
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка получении информации о стороннем пользователе'});
        }
    }
}

module.exports = new UserController()