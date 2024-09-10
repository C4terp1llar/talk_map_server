const User = require("../models/userModel");

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


}

module.exports = new RegistrationService();