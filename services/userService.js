const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Avatar = require("../models/avatarModel");
const Wallpaper = require("../models/wallpaperModel");
const ImgService = require("../services/imgService");

class UserService {
    async getUserInfo(uid) {
        try {
            const mainData = await User.findById(uid).select('-password').lean();
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
            return await Avatar.findOne({ user_id: uid }).select('asset_url').lean();
        } catch (err) {
            console.error("Ошибка при получении аватара пользователя");
            throw err;
        }
    }

    async getUserWallpaper(uid) {
        try {
            return await Wallpaper.findOne({ user_id: uid }).select('asset_url').lean();
        } catch (err) {
            console.error("Ошибка при получении обоев пользователя");
            throw err;
        }
    }

    async getUserAddress (uid){
        try{
            const addressSnapshot = await Address.findOne({user_id: uid}).lean()

            return{
                lat: addressSnapshot.lat,
                lon: addressSnapshot.lon,
                address: addressSnapshot.address
            }
        }catch(err){
            console.error("Ошибка при получении адреса пользователя");
            throw err;
        }
    }

    async createAvatar (uid, public_id, asset_id, asset_url, path) {
        try{
            const existingAvatar = await Avatar.findOne({ user_id: uid }).lean();

            if (existingAvatar) {
                await ImgService.deleteImg(existingAvatar.public_id);
            }

            await Avatar.findOneAndUpdate(
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

    async createWallpaper (uid, public_id, asset_id, asset_url, path) {
        try{

            const existingWallpaper = await Wallpaper.findOne({ user_id: uid }).lean();

            if (existingWallpaper) {
                await ImgService.deleteImg(existingWallpaper.public_id);
            }

            await Wallpaper.findOneAndUpdate(
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
}

module.exports = new UserService();