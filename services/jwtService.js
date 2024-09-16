const jwt = require('jsonwebtoken');

class JwtService {
    createToken(payload) {
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '10m' });
    }

    verifyToken(token) {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    }
}

module.exports = new JwtService();