// socket/database.js
import { getDatabase, handleError } from "./utils.js";

export function setupDatabaseHandlers(io, clientDatabases, channelClients) {
  return (socket) => {
    socket.on("db:action", async ({ channel, query, method }) => {
      let db;
      try {
        db = getDatabase(clientDatabases, socket.id);
      } catch (err) {
        handleError(socket, err);
        return;
      }

      try {
        const response = await db.execute(query, method);
        socket.emit(`${channel}:result`, response);

        // Minden feliratkozott kliensnek elküldjük a változást
        if (channelClients.has(channel) && response.status === "success") {
          io.to(channel).emit(`${channel}:change`, response);
        }
      } catch (err) {
        socket.emit(`${channel}:result`, { status: "error", method, error: err.message });
      }
    });

    socket.on("db:listen", (channel) => {
      try {
        if (!channelClients.has(channel)) {
          channelClients.set(channel, new Set());
        }
        channelClients.get(channel).add(socket.id);
        socket.join(channel);
        console.log(`Socket ${socket.id} listening to database changes on channel: ${channel}`);
      } catch (err) {
        handleError(socket, err);
      }
    });
  };
}