const authService = require('../services/authService');

const bcrypt = require('bcrypt');
const JwtService = require("../services/jwtService");
const RegistrationService = require("../services/registrationService");

class AuthController {
    async login(req, res) {
        const { email, password, device_info } = req.body;

        if (!email || !password || !device_info) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            // Достаю данные по имаилу юзера из запроса
            const currentUser = await authService.getUser(email);
            // Если юзера по имаилу нет
            if (!currentUser) {
                return res.status(400).json({ login: false, message: 'Пользователя с таким email не существует' });
            }

            const { _id: uid, password: currentPassword, nickname } = currentUser;

            // сравниваю хешир пароль с паролем из реквеста
            const match = await bcrypt.compare(password, currentPassword);

            if (!match) {
                return res.status(400).json({ login: false, message: 'Неверный пароль' });
            }
            // перед проверкой рефреш токена по ине о девайсе сразу чищу все истеккшие рефреш токены для юида
            await JwtService.clearExpiredTokens(uid);
            // пробую доставть рефреш токен по иные об устройстве если он есть
            const refreshTokenForCurrentDevice = await JwtService.getRefreshTokenByDevice(uid, device_info);

            const accessToken = JwtService.createAccessToken({ uid, email, device_info });
            let refreshToken;
            // если по итогу токена по инфе об устройстве не нашел то делаю неовый токен с новой инфой об устройстве
            if (!refreshTokenForCurrentDevice) {
                refreshToken = JwtService.createRefreshToken({ uid, email, device_info });
                // сохраняю новый рефреш с новой инфой об устройстве в бд
                await RegistrationService.saveRefreshToken(uid, refreshToken, device_info)
            }else{
                refreshToken = refreshTokenForCurrentDevice; // если токен по инфе из реквеста существует тогда беру его (он точно не истек тк ранбше было clearExpired)
            }

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            })

            res.status(200).json({login: true, message: 'Пользователь успешно авторизован', nickname: nickname, accessToken: accessToken})

        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибка при авторизации'});
        }
    }

    async refresh(req, res) {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Нехватает данных или данные некорректны'});
        }

        try {
            const { uid, email, device_info } = JwtService.verifyRefreshToken(refreshToken);

            // очистка истекших рефрешей
            await JwtService.clearExpiredTokens(uid);

            // сравнение рефреша из реквеста и рефреша из бд
            const refreshTokenFromDb = await JwtService.getRefreshTokenByDevice(uid, device_info);

            if (!refreshTokenFromDb || refreshTokenFromDb !== refreshToken) {
                return res.status(403).json({ error: 'Неверный refresh токен' });
            }

            await JwtService.deleteRefreshToken(uid, device_info)

            const newAccessToken = JwtService.createAccessToken({ uid, email, device_info });

            const newRefreshToken = JwtService.createRefreshToken({ uid, email, device_info });
            await RegistrationService.saveRefreshToken(uid, newRefreshToken, device_info)

            res.cookie('refresh_token', newRefreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            });

            res.json({ accessToken: newAccessToken });
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Токен истек, релогин' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ error: 'Неверный токен, релогин' });
            } else {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка при синхронизации данных' });
            }
        }
    }


    async sync(req, res) {

        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Токен отсутствует' });
        }

        try {
            JwtService.verifyAccessToken(token);

            res.status(200).json({message: 'ok'})
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Токен истек, рефреш' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ error: 'Неверный токен, релогин' });
            } else {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка при синхронизации данных' });
            }
        }
    }

    async test (req, res) {
        try{
            res.status(200).json({message: 'ok'});
        }catch(err){
            console.error(err);
            return res.status(500).json({error: 'Ошибк'});
        }
    }
}

module.exports = new AuthController();