const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Token = require("../models/tokenModel");
const CommonAvatar = require("../models/commonAvatarModel");

class RegistrationService {

    // проверяем занят ли емаил
    async isEmailTaken(email){
        try {
            const user = await User.findOne({email: email});

            return user !== null;
        }catch(err){
            console.error("Ошибка при проверке емаила");
            throw err;
        }
    }

    async getAvatars(){
        try {
            const avatars = await CommonAvatar.find({}, { img_url: 1, _id: 0 });
            return avatars.map(avatar => avatar.img_url);
        }catch(err){
            console.error("Ошибка при получение готовых аватарок");
            throw err;
        }
    }
    
    async changeUserPassword(email, newPassword){
        try{
            await User.findOneAndUpdate(
                { email: email },
                { password: newPassword }
            );
        }catch (err) {
            console.error("Ошибка при смене пароля");
            throw err;
        }
    }

    async checkUserNickname (nickname) {
        try{
            const user = await User.findOne({nickname: nickname});

            return user !== null;
        }catch(err){
            console.error("Ошибка при проверке никнейма");
            throw err;
        }
    }

    async registerUser(email, password, nickname, b_date, gender){
        try {
            const newUser = new User({
                email: email,
                password: password,
                nickname: nickname,
                b_date: b_date,
                gender: gender
            });

            const {_id} = await newUser.save();

            return _id

        } catch(err){
            console.error("Ошибка при создании юзера");
            throw err;
        }
    }

    async createAddress(uid, {lat, lon, name}) {
        try {
            const newAddress = new Address({
                user_id: uid,
                lat,
                lon,
                address: name
            });

            await newAddress.save();
        } catch (err) {
            console.error("Ошибка при создании адреса");
            throw err;
        }
    }

    async saveRefreshToken(uid, token, device) {
        try {
            const newToken = new Token({
                user_id: uid,
                token,
                device
            });

            await newToken.save();

        } catch (err) {
            console.error("Ошибка при сохранении токена");
            throw err;
        }
    }
}

module.exports = new RegistrationService();