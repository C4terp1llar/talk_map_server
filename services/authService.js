const User = require("../models/userModel");

class AuthService {

    async getUser(email){
        try{
            const userSnapshot = await User.findOne({email: email})

            if (!userSnapshot){
                return null
            }else{
                return userSnapshot
            }
        }catch(err){
            console.error("Ошибка при проверке авторизации");
            throw err;
        }
    }

}

module.exports = new AuthService();