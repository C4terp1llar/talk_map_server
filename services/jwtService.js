const jwt = require('jsonwebtoken');
const Token = require('../models/tokenModel');

class JwtService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
        this.sessionTokenSecret = process.env.JWT_SESSION_SECRET;
    }

    createAccessToken(payload, expiresIn = '15m') {
        return jwt.sign(payload, this.accessTokenSecret, { expiresIn });
    }

    verifyAccessToken(token) {
        return jwt.verify(token, this.accessTokenSecret);
    }

    createRefreshToken(payload, expiresIn = '15d') {
        return jwt.sign(payload, this.refreshTokenSecret, { expiresIn });
    }

    verifyRefreshToken(token) {
        return jwt.verify(token, this.refreshTokenSecret);
    }

    createSessionToken(payload, expiresIn = '1h') {
        return jwt.sign(payload, this.sessionTokenSecret, { expiresIn });
    }

    verifySessionToken(token) {
        return jwt.verify(token, this.sessionTokenSecret);
    }

    async clearExpiredTokens(userId) {
        const expirationPeriod = 15 * 24 * 60 * 60 * 1000; // 15 дней

        const expirationDate = new Date(Date.now() - expirationPeriod);

        try {
            await Token.deleteMany({
                user_id: userId,
                created: { $lt: expirationDate }
            });

        } catch (err) {
            console.error("Ошибка при удалении истекших токенов");
            throw err;
        }
    }

    async getRefreshTokenByDevice(userId, device) {
        try {
            const tokenSnapshot = await Token.findOne({
                user_id: userId,
                device: device
            });

            if (tokenSnapshot) {
                return tokenSnapshot;
            } else {
                return null;
            }
        } catch (err) {
            console.error('Ошибка при поиске токена по устройству');
            throw err;
        }
    }

    async deleteRefreshToken(userId, device) {
        try {
            await Token.deleteOne({
                user_id: userId,
                device: device
            });
        } catch (err) {
            console.error('Ошибка при удалении рефреш токена');
            throw err;
        }
    }
}

module.exports = new JwtService();