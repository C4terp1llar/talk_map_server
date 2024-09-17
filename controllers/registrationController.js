const RegistrationService = require('../services/registrationService');
const MailService = require('../services/mailService');
const GeoService = require('../services/geoService');
const JwtService = require('../services/jwtService');
const ImgService = require('../services/imgService');

const bcrypt = require('bcrypt');

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

        const token = JwtService.createSessionToken({email: email, verifyCode: code})

        console.log(email, code)
        try{
            await MailService.sendRegCode(email, code);

            res.cookie('sessionId', token, {
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
        const token = req.cookies.sessionId;

        if (!code || !token) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try {
            const { email, verifyCode } = JwtService.verifySessionToken(token);

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

    async registerUser(req, res){
        const {email, password, nickname, date_b, gender, avatar, address, device_info} = req.body;

        if (!email || !password || !nickname || !date_b || !gender || !avatar || !address || !device_info) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const userBDate = new Date(date_b)

            const userGender = gender === 'Мужской' ? 'male' : 'female';

            const userPassword = await bcrypt.hash(password, 5);

            const userAvatar = await ImgService.uploadImg(avatar)

            console.log(userAvatar)

            const uid = await RegistrationService.registerUser(email, userPassword, nickname, userBDate, userGender, userAvatar)

            await RegistrationService.createAddress(uid, address) // адресс валид на фронте и содержит lat + lon + address (текст адреса)

            const accessToken = JwtService.createAccessToken({ uid, email });
            const refreshToken = JwtService.createRefreshToken({ uid, email });

            await RegistrationService.saveRefreshToken(uid, refreshToken, device_info)

            res.cookie('access_token', accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            })

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            })

            res.status(201).json({message: 'Пользователь успешно зарегистрирован'})
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при регистрации аккаунта'});
        }
    }
}

module.exports = new RegistrationController();