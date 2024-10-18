const JwtService = require('../services/jwtService');

class WsBaseController {

    connect(socket, connectedSockets) {
        const token = socket.handshake.auth.token?.split(' ')[1];

        if (token) {
            try {
                const userData = JwtService.verifyAccessToken(token);
                connectedSockets.set(socket.id, userData);
                console.log(`Пользователь ${userData.uid} подключен с сокетом ${socket.id}`);
            } catch (err) {
                console.error('Некорректный токен');
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
            if (connectedSockets.has(socket.id)) {
                console.log(`Пользователь ${connectedSockets.get(socket.id).uid} отключен с сокетом ${socket.id}`);
                connectedSockets.delete(socket.id);
            }
        });

        socket.on("connect_error", (error) => {
            console.error("Ошибка соединения:", error.message);
        });
    }
}

module.exports = new WsBaseController();
