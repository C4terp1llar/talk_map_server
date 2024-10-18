const { Server } = require("socket.io");
const wsBaseController = require("../controllers/wsBaseController");

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
            // базовая обработка 'connection', внутри => 'disconnect' + 'connect_error'
            wsBaseController.connect(socket, this.connectedSockets);


            socket.on("custom_event", () => {
                console.log("custom_event", socket.id, this.connectedSockets);
            });
        });
    }
}

module.exports = new WsServer();
