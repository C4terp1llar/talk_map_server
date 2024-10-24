const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Avatar = require("../models/avatarModel");
const Wallpaper = require("../models/wallpaperModel");
const ImgService = require("../services/imgService");
const originalWallpaper = require('../models/originalWallpaperModel')
const originalAvatar = require('../models/originalAvatarModel');
const Tag = require("../models/tagModel");

const mongoose = require('mongoose');

const axios = require('axios');

class UserService {
    async getUserInfo(uid, mode) {
        try {

            let excludeString;

            if (mode && mode === 'external'){
                excludeString = '-email -password -__v'
            }else{
                excludeString = '-password -_id -__v'
            }

            const mainData = await User.findById(uid).select(excludeString).lean();
            const [avatar, wallpaper, tags] = await Promise.all([
                this.getUserAvatar(uid),
                this.getUserWallpaper(uid),
                this.getUserTags(uid)
            ]);

            return {
                ...mainData,
                avatar: avatar ? avatar.asset_url : null,
                wallpaper: wallpaper ? wallpaper.asset_url : null,
                tags: tags ? tags : null
            };
        } catch (err) {
            console.error("Ошибка при получении информации о пользователе");
            throw err;
        }
    }

    async getUserAvatar(uid) {
        try {
            return await Avatar.findOne({user_id: uid}).lean();
        } catch (err) {
            console.error("Ошибка при получении аватара пользователя");
            throw err;
        }
    }

    async getUserWallpaper(uid) {
        try {
            return await Wallpaper.findOne({user_id: uid}).lean();
        } catch (err) {
            console.error("Ошибка при получении обоев пользователя");
            throw err;
        }
    }

    async getUserAddress(uid, mode) {
        try {
            let excludeString;

            if (mode && mode === 'external'){
                excludeString = 'city country country_code -_id'
            }else{
                excludeString = '-user_id -_id -__v'
            }

            return await Address.findOne({user_id: uid}).select(excludeString).lean()
        } catch (err) {
            console.error("Ошибка при получении адреса пользователя");
            throw err;
        }
    }

    async changeAddress(uid, address) {
        try {
            await Address.findOneAndUpdate({user_id: uid}, {$set: address})
        } catch (err) {
            console.error("Ошибка при изменении адреса пользователя");
            throw err;
        }
    }

    async createAvatar(uid, public_id, asset_id, asset_url, path, force) {
        try {
            const model = force === 'uploadCrop' ? originalAvatar : Avatar

            const existingAvatar = await model.findOne({user_id: uid}).lean();

            if (existingAvatar) {
                await ImgService.deleteImg(existingAvatar.public_id);
            }

            await model.findOneAndUpdate(
                {user_id: uid},
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
        } catch (err) {
            console.error("Ошибка при создании аватара");
            throw err;
        }
    }

    async createWallpaper(uid, public_id, asset_id, asset_url, path, force) {
        try {
            const model = force === 'uploadCrop' ? originalWallpaper : Wallpaper

            const existingWallpaper = await model.findOne({user_id: uid}).lean();

            if (existingWallpaper) {
                await ImgService.deleteImg(existingWallpaper.public_id);
            }

            await model.findOneAndUpdate(
                {user_id: uid},
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
        } catch (err) {
            console.error("Ошибка при создании обоев");
            throw err;
        }
    }

    async getOriginalWallpaper(uid) {
        try {
            return await originalWallpaper.findOne({user_id: uid}).lean();
        } catch (err) {
            console.error("Ошибка при получении оригинальных обоев");
            throw err;
        }
    }

    async getOriginalAvatar(uid) {
        try {
            return await originalAvatar.findOne({user_id: uid}).lean();
        } catch (err) {
            console.error("Ошибка при получении оригинального аватара");
            throw err;
        }
    }

    async convertUrlToBase64(url) {
        try {
            const response = await axios.get(url, {responseType: 'arraybuffer'});

            const mimeType = response.headers['content-type'];

            const base64Image = Buffer.from(response.data).toString('base64');

            return `data:${mimeType};base64,${base64Image}`;
        } catch (err) {
            console.error("Ошибка при конвертации url в base 64");
            throw err;
        }
    }

    async deleteAllWallpaper(uid) {
        try {
            await Promise.all([
                Wallpaper.findOneAndDelete({user_id: uid}),
                originalWallpaper.findOneAndDelete({user_id: uid})
            ])
        } catch (err) {
            console.error("Ошибка при удалении обоев");
            throw err;
        }
    }

    async changeNickname(uid, nick) {
        try {
            await User.findByIdAndUpdate(uid, {nickname: nick})
        } catch (err) {
            console.error("Ошибка при изменении никнейма");
            throw err;
        }
    }

    async changeNicknameColor(uid, color) {
        try {
            const newColor = color === 'default' ? null : color;
            await User.findByIdAndUpdate(uid, {nickname_color: newColor})
        } catch (err) {
            console.error("Ошибка при изменении цвета никнейма");
            throw err;
        }
    }

    async setUserTag(uid, emoji, text) {
        try {
            const tag = new Tag({user_id: uid, emoji, text});
            await tag.save();
        } catch (err) {
            console.error("Ошибка при добавлении тега");
            throw err;
        }
    }

    async getUserTags(uid) {
        try {
            return await Tag.find({user_id: uid}).select('-_id -__v -user_id').lean();
        } catch (err) {
            console.error("Ошибка при получении тега");
            throw err;
        }
    }

    async deleteUserTag(uid, tagText) {
        try {
            await Tag.findOneAndDelete({user_id: uid, text: tagText})
        } catch (err) {
            console.error("Ошибка при удалении тега");
            throw err;
        }
    }

    async findUsers(cityFilter, minAgeFilter, maxAgeFilter, genderFilter, nicknameFilter, requesterUid, page, limit) {
        try {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();

            const filter = {};

            // исключить пользователя который запрашивает
            if (requesterUid) {
                filter._id = { $ne: new mongoose.Types.ObjectId(requesterUid) };
            }

            // если передан пол
            if (genderFilter && genderFilter !== 'any') {
                filter.gender = genderFilter;
            }

            // если передан возраст
            if (minAgeFilter !== 14 || maxAgeFilter !== 100) {
                const minBirthDate = new Date(currentYear - maxAgeFilter, 0, 1);
                const maxBirthDate = new Date(currentYear - minAgeFilter, 11, 31);

                filter.b_date = {
                    $gte: minBirthDate,
                    $lte: maxBirthDate,
                };
            }

            // если передан никнейм
            if (nicknameFilter) {
                filter.nickname = new RegExp(nicknameFilter, 'i');
            }

            const users = await User.aggregate([
                {
                    $lookup: {
                        from: 'addresses',
                        localField: '_id',
                        foreignField: 'user_id',
                        as: 'address',
                    }
                },
                {
                    $unwind: {
                        path: '$address',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'avatars',
                        localField: '_id',
                        foreignField: 'user_id',
                        as: 'avatar',
                    },
                },
                {
                    $unwind: {
                        path: '$avatar',
                        preserveNullAndEmptyArrays: true
                    },
                },
                {
                    $match: cityFilter ? {'address.city': cityFilter} : {},
                },
                {
                    $match: filter,
                },
                {
                    $project: {
                        nickname: 1,
                        nickname_color: 1,
                        gender: 1,
                        b_date: 1,
                        'address.city': 1,
                        'address.country': 1,
                        'address.country_code': 1,
                        'avatar.asset_url': 1
                    },
                },
                {
                    $skip: (page - 1) * limit,
                },
                {
                    $limit: limit,
                }
            ]);

            return users;
        } catch (err) {
            console.error("Ошибка при поиске пользователей");
            throw err;
        }
    }

    async isUserExists(uid) {
        try {
            if (!mongoose.Types.ObjectId.isValid(uid)) return false;

            const userExists = await User.exists({_id: uid});
            return !!userExists;
        } catch (err) {
            console.error("Ошибка при проверке существования пользователя");
            throw err;
        }
    }
}

module.exports = new UserService();