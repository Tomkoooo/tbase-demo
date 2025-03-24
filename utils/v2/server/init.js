// socket/init.js
import { MongoDB } from "../database/mongodb.js";
import { handleError } from "./utils.js";

export function setupInitialization(io, clientDatabases) {
  return (socket) => {
    socket.on("initialize", async ({ dbType, connectionInfo }) => {
      let db;
      if (dbType === "mongodb") {
        db = new MongoDB();
      } else {
        socket.emit("error", { message: "Unsupported database type" });
        return;
      }

      try {
        await db.connect(connectionInfo);
        clientDatabases.set(socket.id, db);
        socket.emit("initialized", { message: `${dbType} initialized` });
      } catch (err) {
        handleError(socket, err);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      clientDatabases.get(socket.id)?.close();
      clientDatabases.delete(socket.id);
    });
  };
}