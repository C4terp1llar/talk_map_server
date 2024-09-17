const JwtService = require('../services/jwtService');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.access_token;

        if (!token) {
            return res.status(401).json({ error: 'Необходима авторизация' });
        }

        req.user = JwtService.verifyAccessToken(token);// пробуем доставть uid и маил юзера

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истек', message: 'refresh' });
        } else {
            console.error(err);
            return res.status(401).json({ error: 'Неверный токен', message: 'auth' });
        }
    }
};

module.exports = authMiddleware;