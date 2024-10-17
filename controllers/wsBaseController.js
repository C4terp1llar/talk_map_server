const JwtService = require('../services/jwtService');


class WsBaseController {

    handleConnect(socket, connectedSockets){
        const token = socket.handshake.auth.token?.split(' ')[1];

        if (token) {
            try {
                const userData = JwtService.verifyAccessToken(token);
                connectedSockets.set(socket.id, userData);

                console.log(`Пользователь ${userData.uid} подключен с сокетом ${socket.id}`);
            } catch (err) {
                console.error('Некорректный токен');
                socket.disconnect();
            }
        } else {
            console.error('Токен отсутствует');
            socket.disconnect();
        }
    }

    handleDisconnect(socket, connectedSockets){
        console.log(`Пользователь ${connectedSockets.get(socket.id).uid} отключен с сокетом ${socket.id}`);
        connectedSockets.delete(socket.id);
        socket.disconnect();
    }

}

module.exports = new WsBaseController();