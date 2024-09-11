const RegistrationService = require('../services/RegistrationService');
const MailService = require('../services/mailService');
const GeoService = require('../services/geoService');

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

        // Сохранение кода в сессии
        req.session.verificationCode = code;
        req.session.email = email;

        try{
            await MailService.sendRegCode(email, code);
            return res.status(200).json({ message: 'Код успешно отправлен' });
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при отправке кода'});
        }
    }

    async verifyCheckCode(req, res){
        const { code } = req.body;

        if (!code) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try {
            // достаем из сессии
            const storedCode = req.session.verificationCode;
            const storedEmail = req.session.email;

            if (storedCode === Number(code)) {
                res.status(200).json({ message: `Емаил ${storedEmail} успешно верифицирован` });
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
            const cities = await GeoService.getCitiesByTxt(query)
            res.status(200).json({ cities: cities });
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при получении адресов'});
        }
    }

    async getCommonAvatars(req, res){
        try{
            const avatars = await RegistrationService.getAvatars()
            res.status(200).json({avatars: avatars});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при получении аватарок'});
        }
    }
}

module.exports = new RegistrationController();