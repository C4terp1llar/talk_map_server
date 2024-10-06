const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Avatar = require("../models/avatarModel");
const Wallpaper = require("../models/wallpaperModel");
const ImgService = require("../services/imgService");
const originalWallpaper = require('../models/originalWallpaperModel')
const originalAvatar = require('../models/originalAvatarModel');

const axios = require('axios');

class UserService {
    async getUserInfo(uid) {
        try {
            const mainData = await User.findById(uid).select('-password -_id -__v').lean();
            const [avatar, wallpaper] = await Promise.all([
                this.getUserAvatar(uid),
                this.getUserWallpaper(uid)
            ]);

            return {
                ...mainData,
                avatar: avatar ? avatar.asset_url : null,
                wallpaper: wallpaper ? wallpaper.asset_url : null
            };
        } catch (err) {
            console.error("Ошибка при получении информации о пользователе");
            throw err;
        }
    }

    async getUserAvatar(uid) {
        try {
            return await Avatar.findOne({ user_id: uid }).lean();
        } catch (err) {
            console.error("Ошибка при получении аватара пользователя");
            throw err;
        }
    }

    async getUserWallpaper(uid) {
        try {
            return await Wallpaper.findOne({ user_id: uid }).lean();
        } catch (err) {
            console.error("Ошибка при получении обоев пользователя");
            throw err;
        }
    }

    async getUserAddress (uid){
        try{
            return await Address.findOne({user_id: uid}).select('-user_id -_id -__v').lean()
        }catch(err){
            console.error("Ошибка при получении адреса пользователя");
            throw err;
        }
    }

    async createAvatar (uid, public_id, asset_id, asset_url, path, force) {
        try{
            const model = force === 'uploadCrop' ? originalAvatar : Avatar

            const existingAvatar = await model.findOne({ user_id: uid }).lean();

            if (existingAvatar) {
                await ImgService.deleteImg(existingAvatar.public_id);
            }

            await model.findOneAndUpdate(
                { user_id: uid },
                {
                    $set: {
                        public_id,
                        asset_id,
                        asset_url,
                        path
                    },
                    $setOnInsert: {
                        user_id: uid
                    }
                },
                {
                    upsert: true,
                }
            );
        }catch(err){
            console.error("Ошибка при создании аватара");
            throw err;
        }
    }

    async createWallpaper (uid, public_id, asset_id, asset_url, path, force) {
        try{
            const model = force === 'uploadCrop' ? originalWallpaper : Wallpaper

            const existingWallpaper = await model.findOne({ user_id: uid }).lean();

            if (existingWallpaper) {
                await ImgService.deleteImg(existingWallpaper.public_id);
            }

            await model.findOneAndUpdate(
                { user_id: uid },
                {
                    $set: {
                        public_id, // если нашли - обновляем эти данные
                        asset_id,
                        asset_url,
                        path
                    },
                    $setOnInsert: {
                        user_id: uid // если не нашли то при создании помимо данных выше еще и создаем
                    }
                },
                {
                    upsert: true, // создаем если не нашли
                }
            );
        }catch(err){
            console.error("Ошибка при создании обоев");
            throw err;
        }
    }

    async getOriginalWallpaper (uid){
        try{
            return await originalWallpaper.findOne({ user_id: uid }).lean();
        }catch (err) {
            console.error("Ошибка при получении оригинальных обоев");
            throw err;
        }
    }

    async getOriginalAvatar (uid){
        try{
            return await originalAvatar.findOne({ user_id: uid }).lean();
        }catch (err) {
            console.error("Ошибка при получении оригинального аватара");
            throw err;
        }
    }

    async convertUrlToBase64 (url){
        try{
            const response = await axios.get(url, { responseType: 'arraybuffer' });

            const mimeType = response.headers['content-type'];

            const base64Image = Buffer.from(response.data).toString('base64');

            return `data:${mimeType};base64,${base64Image}`;
        }catch (err) {
            console.error("Ошибка при конвертации url в base 64");
            throw err;
        }
    }

    async deleteAllWallpaper (uid){
        try{
            await Promise.all([
                Wallpaper.findOneAndDelete({user_id: uid}),
                originalWallpaper.findOneAndDelete({user_id: uid})
            ])
        }catch (err) {
            console.error("Ошибка при удалении обоев");
            throw err;
        }
    }

    async changeNickname (uid, nick){
        try{
            await User.findByIdAndUpdate(uid, {nickname: nick})
        }catch (err) {
            console.error("Ошибка при изменении никнейма");
            throw err;
        }
    }

    async changeNicknameColor (uid, color){
        try{
            const newColor = color === 'default' ? null : color;
            await User.findByIdAndUpdate(uid, {nickname_color: newColor})
        }catch (err) {
            console.error("Ошибка при изменении цвета никнейма");
            throw err;
        }
    }
}

module.exports = new UserService();