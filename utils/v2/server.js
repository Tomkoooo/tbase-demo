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
import { setupNotificationHandlers } from "./server/socket/notification.js";
import { setupBucketHandlers } from "./server/socket/bucket.js";
import { setupPermissionHandlers } from "./server/socket/permission.js";
import { setupTeamHandlers } from "./server/socket/teams.js"; // Teams handler importálása

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  const clientDatabases = new Map();
  const onlineUsers = new Map();
  const channelClients = new Map();
  let notificationHandler;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    const initHandler = setupInitialization(io, clientDatabases);
    const accountHandler = setupAccountHandlers(io, clientDatabases, onlineUsers);
    const usersHandler = setupUsersHandlers(io, clientDatabases, onlineUsers);
    const channelsHandler = setupChannelsHandlers(io, clientDatabases, channelClients);
    const databaseHandler = setupDatabaseHandlers(io, clientDatabases, channelClients);
    const notificationHandlerSetup = setupNotificationHandlers(io, clientDatabases, () => notificationHandler, (handler) => { notificationHandler = handler; });
    const bucketHandler = setupBucketHandlers(io, clientDatabases);
    const permissionHandler = setupPermissionHandlers(io, clientDatabases);
    const teamHandler = setupTeamHandlers(io, clientDatabases); // Teams handler hozzáadása

    initHandler(socket);
    accountHandler(socket);
    usersHandler(socket);
    channelsHandler(socket);
    databaseHandler(socket);
    notificationHandlerSetup(socket);
    bucketHandler(socket);
    permissionHandler(socket);
    teamHandler(socket);
  });

  httpServer.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}`);
  });
});