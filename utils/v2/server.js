// server.js
import { createServer } from "node:http";
import { Server } from "socket.io";
import next from "next";
import { dev, hostname, port } from "./dist/config.js";
import { setupInitialization } from "./server/init.js";
import { setupAccountHandlers } from "./server/methods/account.js";
import { setupUsersHandlers } from "./server/methods/users.js";
import { setupChannelsHandlers } from "./server/methods/channel.js";
import { setupDatabaseHandlers } from "./server/methods/database.js";

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  const clientDatabases = new Map();
  const onlineUsers = new Map(); // Online felhasználók tárolása
  const channelClients = new Map(); // Csatorna kliensek tárolása

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Eseménykezelők inicializálása
    const initHandler = setupInitialization(io, clientDatabases);
    const accountHandler = setupAccountHandlers(io, clientDatabases, onlineUsers); // onlineUsers átadása
    const usersHandler = setupUsersHandlers(io, clientDatabases, onlineUsers); // onlineUsers átadása
    const channelsHandler = setupChannelsHandlers(io, clientDatabases, channelClients); // channelClients átadása
    const databaseHandler = setupDatabaseHandlers(io, clientDatabases, channelClients); // channelClients átadása

    initHandler(socket);
    accountHandler(socket);
    usersHandler(socket);
    channelsHandler(socket);
    databaseHandler(socket);
  });

  httpServer.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}`);
  });
});