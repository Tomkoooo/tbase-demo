import { Client } from "./socket";

export const mongoClient = new Client("http://localhost:3000")
.database("mongodb")
.connection({
  url: "mongodb+srv://admin:admin@culster0.tfml4.mongodb.net/?retryWrites=true&w=majority&appName=culster0",
  dbName: "socket-test",
});