const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Token = require("../models/tokenModel");
const CommonAvatar = require("../models/commonAvatarModel");

class UserService {
    async getUserInfo (uid){
        try{
            const userSnapshot = await User.findById(uid).lean()

            return {
                email: userSnapshot.email,
                nickname: userSnapshot.nickname,
                b_date: userSnapshot.b_date,
                gender: userSnapshot.gender,
                avatar: userSnapshot.avatar,
            }

        }catch(err){
            console.error("Ошибка при получении информации о пользователе");
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
}

module.exports = new UserService();