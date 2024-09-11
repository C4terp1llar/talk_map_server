const User = require("../models/userModel");
const CommonAvatar = require("../models/commonAvatarModel");
class RegistrationService {

    // проверяем занят ли емаил
    async isEmailTaken(email){
        try {
            const user = User.findOne({email: email});
            return user === null;
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

}

module.exports = new RegistrationService();