const RegistrationService = require('../services/registrationService');
const MailService = require('../services/mailService');
const GeoService = require('../services/geoService');
const JwtService = require('../services/jwtService');

class RegistrationController {

    async isEmailBusy(req, res){
        const { email } = req.body;

        if (!email) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const isTaken = await RegistrationService.isEmailTaken(email)
            return res.status(200).json({isTaken: isTaken})
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при проверке емаила'});
        }
    }

    async sendCheckCode(req, res){
        const { email } = req.body;

        if (!email) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        const code = Math.floor(1000 + Math.random() * 9000);

        const token = JwtService.createToken({email: email, verifyCode: code})

        console.log(email, code)
        try{
            await MailService.sendRegCode(email, code);

            res.cookie('sessionID', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            });

            return res.status(200).json({ message: 'Код успешно отправлен' });
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при отправке кода'});
        }
    }

    async verifyCheckCode(req, res){
        const { code } = req.body;
        const token = req.cookies.sessionID;

        if (!code || !token) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try {
            const { email, verifyCode } = JwtService.verifyToken(token);

            console.log(email, verifyCode, code)

            if (verifyCode  === Number(code)) {
                res.status(200).json({ message: `Емаил ${email} успешно верифицирован` });
            } else {
                res.status(400).json({ message: 'Неверный код' });
            }
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при проверке кода'});
        }
    }

    async getCities(req, res){
        const { query } = req.body;

        if (!query) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const response = await GeoService.getCitiesByTxt(query)
            res.status(200).json(response);
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при получении адресов'});
        }
    }

    async getCommonAvatars(req, res){
        try{
            const avatars = await RegistrationService.getAvatars()
            res.status(200).json(avatars);
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при получении аватарок'});
        }
    }
}

module.exports = new RegistrationController();