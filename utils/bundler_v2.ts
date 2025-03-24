// utils/bundlers.ts
import { ClientConnection } from "./v2/socket"; // Feltételezem, hogy a socket.ts a root/socket mappában van

// Konfiguráció (pl. MongoDB connection info)
const connectionInfo = {
  url: "mongodb://localhost:27017",
  dbName: "mydb",
};

// Kliens inicializálása
export const mongoClient = new ClientConnection("http://localhost:3000");

mongoClient.initialize("mongodb", connectionInfo).then(() => {
  console.log("MongoDB client initialized from bundler");
}).catch((err) => {
  console.error("Failed to initialize MongoDB client:", err);
});