const { Server } = require("socket.io");
const wsBaseController = require('../controllers/wsBaseController')

class WsServer {

    constructor() {
        this.wsNamespace = null;
        this.connectedSockets = new Map();
    }

    initializeSocketServer(httpServer, allowedOrigins) {
        const io = new Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                credentials: true,
            },
        });

        this.wsNamespace = io.of("/ws");

        this.wsNamespace.on("connection", (socket) => {
            wsBaseController.handleConnect(socket, this.connectedSockets)

            console.log(this.connectedSockets)

            socket.on("disconnect", () => {
                wsBaseController.handleDisconnect(socket, this.connectedSockets)
            });
        });
    }
}

module.exports = new WsServer();
