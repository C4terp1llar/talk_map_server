const RegistrationService = require('../services/registrationService');
const MailService = require('../services/mailService');
const GeoService = require('../services/geoService');
const JwtService = require('../services/jwtService');
const ImgService = require('../services/imgService');
const AuthService = require('../services/authService');
const UserService = require('../services/userService');
const bcrypt = require('bcrypt');
const userService = require("../services/userService");

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
        const { email, type } = req.body;

        if (!email || !type || !(type !== 'registration' || type !== 'recovery')) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        const code = Math.floor(1000 + Math.random() * 9000);

        console.log(email, code)
        try{

            const hashedCode = await bcrypt.hash(code.toString(), 5);

            const token = JwtService.createSessionToken({email: email, verifyCode: hashedCode})

            if (type === 'recovery') {
                await MailService.sendRecoveryCode(email, code);
            }else{
                await MailService.sendRegCode(email, code);
            }

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

            const match = await bcrypt.compare(code, verifyCode);

            if (match) {
                res.status(200).json({ message: `Емаил ${email} успешно верифицирован` });
            } else {
                res.status(400).json({ message: 'Неверный код' });
            }
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при проверке кода'});
        }
    }

    // для рекавери

    async changeUserPassword (req, res) {
        const { email, password } = req.body;

        if (!email || !password) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const user = await AuthService.getUser(email)

            const match = await bcrypt.compare(password, user.password);

            if (match){
                return res.status(200).json({message: 'Пароли совпадают', passChangeNeed: false});
            }

            const newUserPassword = await bcrypt.hash(password, 5);

            await RegistrationService.changeUserPassword(email, newUserPassword);

            res.status(200).json({ message: `Пароль пользователя с ${email} успешно изменен` , passChangeNeed: true});
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при изменении пароля'});
        }
    }
    //

    async checkNickname (req, res) {
        const { nickname } = req.body;

        if (!nickname) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const isTaken = await RegistrationService.checkUserNickname(nickname);
            return res.status(200).json({isTaken: isTaken})
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при проверке никнейма'});
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
        const {email, password, nickname, date_b, gender, avatar, address, originalAvatar, device_info} = req.body;

        if (!email || !password || !nickname || !date_b || !gender || !avatar || !address || !device_info) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            const userBDate = new Date(date_b)

            const userGender = gender === 'Мужской' ? 'male' : 'female';

            const userPassword = await bcrypt.hash(password, 5);

            const uid = await RegistrationService.registerUser(email, userPassword, nickname, userBDate, userGender)

            const {public_id, asset_id, asset_url, path} = await ImgService.uploadImg(avatar, uid, 'avatar');
            await UserService.createAvatar(uid, public_id, asset_id, asset_url, path, 'onlyCrop');

            if (originalAvatar){
                const {public_id, asset_id, asset_url, path} = await ImgService.uploadImg(originalAvatar, uid, 'originalAvatar')
                await userService.createAvatar(uid, public_id, asset_id, asset_url, path, 'uploadCrop');
            }

            await RegistrationService.createAddress(uid, address)

            const accessToken = JwtService.createAccessToken({ uid, email, device_info });
            const refreshToken = JwtService.createRefreshToken({ uid, email, device_info });

            await RegistrationService.saveRefreshToken(uid, refreshToken, device_info)

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            })

            res.status(201).json({message: 'Пользователь зарегистрирован', accessToken: accessToken})
        }catch (err) {
            console.error(err);
            return res.status(500).json({error: 'Ошибка при регистрации аккаунта'});
        }
    }
}

module.exports = new RegistrationController();