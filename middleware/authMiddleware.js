const JwtService = require('../services/jwtService');

const authMiddleware = async (req, res, next) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return res.status(403).json({ error: 'Необходима авторизация' });
    }

    try {
        req.user = JwtService.verifyAccessToken(accessToken);
        return next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истек' });
        } else {
            return res.status(403).json({ error: 'Неверный токен' });
        }
    }
};

module.exports = authMiddleware;
