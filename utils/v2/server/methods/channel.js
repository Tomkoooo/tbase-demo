// socket/channels.js
import { getDatabase, handleError } from "../utils.js";

export function setupChannelsHandlers(io, clientDatabases, channelClients) {
  return (socket) => {
    socket.on("subscribe", (channel) => {
      try {
        if (!channelClients.has(channel)) {
          channelClients.set(channel, new Set());
        }
        channelClients.get(channel).add(socket.id);
        socket.join(channel);
        console.log(`Socket ${socket.id} subscribed to channel: ${channel}`);
      } catch (err) {
        handleError(socket, err);
      }
    });

    socket.on("listen", (channel) => {
      try {
        if (!channelClients.has(channel)) {
          channelClients.set(channel, new Set());
        }
        channelClients.get(channel).add(socket.id);
        socket.join(channel);
        console.log(`Socket ${socket.id} listening to channel: ${channel}`);
      } catch (err) {
        handleError(socket, err);
      }
    });

    socket.on("unsubscribe", (channel) => {
      try {
        if (channelClients.has(channel)) {
          channelClients.get(channel).delete(socket.id);
          if (channelClients.get(channel).size === 0) {
            channelClients.delete(channel);
          }
          socket.leave(channel);
          console.log(`Socket ${socket.id} unsubscribed from channel: ${channel}`);
        }
      } catch (err) {
        handleError(socket, err);
      }
    });

    socket.on("message", ({ channel, data }) => {
      try {
        if (channelClients.has(channel)) {
          io.to(channel).emit(channel, data);
          console.log(`Message sent to channel ${channel}:`, data);
        }
      } catch (err) {
        handleError(socket, err);
      }
    });

    // Csatornák tisztítása disconnect esetén
    socket.on("disconnect", () => {
      for (const [channel, clients] of channelClients) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            channelClients.delete(channel);
          }
        }
      }
    });
  };
}