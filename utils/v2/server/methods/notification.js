// server/socket/notification.js
import Notification from "../notification.js";
import { MongoDB } from "../database/mongodb.js";

export function setupNotificationHandlers(io, clientDatabases, getNotificationHandler, setNotificationHandler) {
  return (socket) => {
    socket.on("initializeNotification", async ({ dbType, connectionInfo }) => {
      let db;
      if (!clientDatabases.has(socket.id) && dbType === "mongodb") {
        db = new MongoDB();
        try {
          await db.connect(connectionInfo);
          clientDatabases.set(socket.id, db);
          console.log(`Database initialized for client ${socket.id}: ${dbType}`);

          // Notification handler inicializálása és beállítása
          const notificationHandler = new Notification(db);
          setNotificationHandler(notificationHandler);
          console.log(`Notification handler initialized for client ${socket.id}`);
        } catch (err) {
          console.error("Database connection error:", err);
          socket.emit("error", { message: "Failed to connect to database" });
        }
      } else if (!clientDatabases.has(socket.id) && dbType === "mysql") {
        socket.emit("error", { message: "MySQL support not implemented yet" });
      } else if (clientDatabases.has(socket.id)) {
        db = clientDatabases.get(socket.id);
        console.log("Database already initialized for client", socket.id);
      } else {
        socket.emit("error", { message: "Unsupported database type" });
      }
    });

    socket.on("subscribe:not", async ({ userId, subscription }) => {
      let notificationHandler = getNotificationHandler();
      if (!notificationHandler) {
        notificationHandler = new Notification(); // Alapértelmezett handler mock DB-vel
        setNotificationHandler(notificationHandler);
      }
      if (!userId || !subscription) {
        console.error("Subscription error:", "User ID and subscription required");
        socket.emit("error", { message: "User ID and subscription required" });
        return;
      }
      console.log("Subscription request:", userId, subscription);
      try {
        await notificationHandler.subscribe(userId, subscription);
        socket.emit("subscribed", { userId });
      } catch (error) {
        console.error(`Subscription error for ${socket.id}:`, error);
        socket.emit("error", { message: "Failed to subscribe" });
      }
    });

    socket.on("unsubscribe:not", async ({ userId, subscription }) => {
      let notificationHandler = getNotificationHandler();
      if (!notificationHandler) {
        notificationHandler = new Notification();
        setNotificationHandler(notificationHandler);
      }
      if (!userId || !subscription) {
        console.error("Unsubscription error:", "User ID and subscription required");
        socket.emit("error", { message: "User ID and subscription required" });
        return;
      }
      try {
        await notificationHandler.unsubscribe(userId, subscription);
        socket.emit("unsubscribed", { userId });
      } catch (error) {
        console.error(`Unsubscription error for ${socket.id}:`, error);
        socket.emit("error", { message: "Failed to unsubscribe" });
      }
    });

    socket.on("sendNotification", async ({ userId, notification }) => {
      let notificationHandler = getNotificationHandler();
      if (!notificationHandler) {
        notificationHandler = new Notification();
        setNotificationHandler(notificationHandler);
      }
      try {
        await notificationHandler.send(userId, notification);
        console.log(`Notification sent to ${userId}`);
      } catch (error) {
        console.error(`Error sending notification for ${socket.id}:`, error);
        socket.emit("error", { message: "Failed to send notification" });
      }
    });
  };
}