const JwtService = require('../services/jwtService');

class WsBaseController {

    connect(socket, connectedSockets) {
        const token = socket.handshake.auth.token?.split(' ')[1];

        if (token) {
            try {
                const userData = JwtService.verifyAccessToken(token);
                const userId = userData.uid;

                if (!connectedSockets[userId]) {
                    connectedSockets[userId] = [];
                }

                connectedSockets[userId].push(socket.id);
            } catch (err) {
                console.error('Некорректный токен');
                socket.emit('tokenError');
                socket.disconnect();
                return;
            }
        } else {
            console.error('Токен отсутствует');
            socket.disconnect();
            return;
        }

        this.attachBaseWsHandlers(socket, connectedSockets);
    }

    attachBaseWsHandlers(socket, connectedSockets) {

        socket.on("disconnect", () => {
            const userId = Object.keys(connectedSockets).find(uid =>
                connectedSockets[uid].includes(socket.id)
            );

            if (userId) {
                connectedSockets[userId] = connectedSockets[userId].filter(id => id !== socket.id);

                if (connectedSockets[userId].length === 0) {
                    delete connectedSockets[userId];
                }
            }
        });

        socket.on("connect_error", (error) => {
            console.error("Ошибка соединения:", error.message);
        });
    }

}

module.exports = new WsBaseController();
