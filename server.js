// server.js (or app.js)

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  // Csatorna adatstruktúra
  const channelClients = {}; // Csatornánkénti kliens lista

  io.on("connection", (socket) => {
    console.log("Client connected: ", socket.id);

    // Kliens csatornára feliratkozása
    socket.on("subscribe", (channel) => {
      if (!channelClients[channel]) {
        channelClients[channel] = new Set();
        console.log(`Channel ${channel} created`);
      }

      channelClients[channel].add(socket.id);
      console.log(`Client ${socket.id} subscribed to ${channel}`);
      socket.join(channel); // A socket csatlakoztatása a csatornához
      //chek if the use is in the cheanel
        console.log(channelClients);
    });

    // Kliens csatornáról való leiratkozása
    socket.on("unsubscribe", (channel) => {
      if (channelClients[channel]) {
        channelClients[channel].delete(socket.id);
        if (channelClients[channel].size === 0) {
          delete channelClients[channel]; // Ha már nem marad senki a csatornán, töröljük
        }
      }
      console.log(`Client ${socket.id} unsubscribed from ${channel}`);
      socket.leave(channel); // A socket eltávolítása a csatornából
    });

    // Üzenet küldése egy csatornára
    socket.on("message", (data) => {
      const { channel, message } = data;
      console.log(`Message to ${channel}: ${message}`);
      console.log(channelClients[channel]);

      // Üzenet küldése a csatornára feliratkozott összes kliensnek
    // Emit to everyone in the channelClients list with the same channel
    if (channelClients[channel]) {
      channelClients[channel].forEach(clientId => {
        console.log(clientId);
        io.to(clientId).emit(channel, { message });
      });
    }
      
      io.to(channel).emit("message", { message });
    });

    // Kliens kapcsolatának lezárása
    socket.on("disconnect", () => {
      console.log("Client disconnected: ", socket.id);
      // Ha a kliens valamelyik csatornán fel volt iratkozva, akkor töröljük
      for (const channel in channelClients) {
        channelClients[channel].delete(socket.id);
        if (channelClients[channel].size === 0) {
          delete channelClients[channel];
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
