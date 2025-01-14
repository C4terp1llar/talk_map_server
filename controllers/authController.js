const authService = require('../services/authService');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');
const JwtService = require("../services/jwtService");
const RegistrationService = require("../services/registrationService");

const wsServer = require('../utils/wsServer')
const asyncTaskRunner = require('../utils/asyncTaskRunner')

class AuthController {
    async login(req, res) {
        const { email, password, device_info } = req.body;

        if (!email || !password || !device_info) return res.status(400).json({error: 'Нехватает данных или данные некорректны'});

        try{
            // Достаю данные по имаилу юзера из запроса
            const currentUser = await authService.getUser(email);
            // Если юзера по имаилу нет
            if (!currentUser) {
                return res.status(400).json({ login: false, message: 'Неверный логин или пароль' });
            }

            const { _id: uid, password: currentPassword, nickname } = currentUser;

            // сравниваю хешир пароль с паролем из реквеста
            const match = await bcrypt.compare(password, currentPassword);
            if (!match) {
                return res.status(400).json({ login: false, message: 'Неверный логин или пароль' });
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
                refreshToken = refreshTokenForCurrentDevice.token; // если токен по инфе из реквеста существует тогда беру его (он точно не истек тк ранбше было clearExpired)
            }

            asyncTaskRunner(async () => {
                wsServer.emitToUser(uid, `sessions_reload`)
            })

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

    async logout (req, res) {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken) {
            return res.status(403).json({ error: 'Нехватает данных или данные некорректны' });
        }

        try {
            const { uid, device_info } = JwtService.verifyRefreshToken(refreshToken);

            await JwtService.deleteRefreshToken(uid, device_info)

            asyncTaskRunner(async () => {
                wsServer.emitToUser(uid, `sessions_reload`)
            })

            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            });

            res.status(200).json({ message: 'Пользователь успешно разлогинен' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при логауте' });
        }
    }

    async refresh(req, res) {
        const refreshToken = req.cookies.refresh_token;
    
        if (!refreshToken) {
            return res.status(403).json({ error: 'Нехватает данных или данные некорректны' });
        }
    
        try {
            const { uid, email, device_info } = JwtService.verifyRefreshToken(refreshToken);
    
            const tokenInfo = await JwtService.getRefreshTokenByDevice(uid, device_info);
            if (!tokenInfo) {
                return res.status(403).json({ error: 'Токен не найден. Требуется повторный вход' });
            }
    
            const tokenAgeMs = Date.now() - new Date(tokenInfo.created).getTime();
            const maxTokenAgeMs = 15 * 24 * 60 * 60 * 1000; // 15 дней
            if (tokenAgeMs > maxTokenAgeMs) {
                await JwtService.deleteRefreshToken(uid, device_info);
                return res.status(403).json({ error: 'Токен устарел. Требуется повторный вход' });
            }
    
            await JwtService.clearExpiredTokens(uid);
    
            const newAccessToken = JwtService.createAccessToken({ uid, email, device_info });
            const newRefreshToken = JwtService.createRefreshToken({ uid, email, device_info });
    
            await JwtService.updateRefreshToken(uid, device_info, newRefreshToken);
  
            res.cookie('refresh_token', newRefreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
            });
    
            res.status(200).json({ accessToken: newAccessToken });
        } catch (err) {
            if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
                const { uid, device_info } = jwt.decode(refreshToken);
                await JwtService.deleteRefreshToken(uid, device_info);
                return res.status(403).json({ error: 'Токен истек или неверен, релогин' });
            } else {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка при синхронизации данных' });
            }
        }
    }
        


    async sync(req, res) {
        try {
            res.status(200).json({message: 'ok'})
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при синхронизации данных' });
        }
    }

}

module.exports = new AuthController();