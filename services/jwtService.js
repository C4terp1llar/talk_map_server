const jwt = require('jsonwebtoken');

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
}

module.exports = new JwtService();