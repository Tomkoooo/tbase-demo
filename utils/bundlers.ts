import { Client } from "./socket";

export const client = new Client()

export const mongoClient = await new Client()
.database("mongodb")
.connection({
  url: "mongodb+srv://admin:admin@culster0.tfml4.mongodb.net/?retryWrites=true&w=majority&appName=culster0",
  dbName: "socket-test",
});

export const mysqlClient = await new Client()
.database("mysql")
.connection({
  host: "localhost",
  user: "root",
  port: 3306,
  database: "socket-test",
});