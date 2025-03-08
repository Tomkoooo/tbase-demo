import { Client } from "./socket";

export const mysqlClient = new Client("http://localhost:3000")
.database("mysql")
.connection({
  host: "localhost",
  user: "root",
  password: "",
  database: "socket-test",
});