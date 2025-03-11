import { Client } from "./socket";

export const client = new Client()

export const mongoClient = new Client()
.database("mongodb")
.connection({
  url: "localhost:27017",
  dbName: "socket-test",
});

export const mysqlClient = new Client()
.database("mysql")
.connection({
  host: "localhost",
  user: "root",
  password: "",
  database: "socket-test",
});