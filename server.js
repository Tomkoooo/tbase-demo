// server.js
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import { ObjectId } from "mongodb";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

class Database {
  async connect(connectionInfo) {}
  async watchChanges(collectionName, callback, options) {}
  async execute(method) {}
  async close() {}
}

class MongoDB extends Database {
  constructor() {
    super();
    this.client = null;
    this.db = null;
    this.lastTimestamp = null;
  }

  async connect(connectionInfo) {
    this.client = new MongoClient(connectionInfo.url);
    await this.client.connect();
    this.db = this.client.db(connectionInfo.dbName || "mydb");
    console.log("Connected to MongoDB");
  }

  async watchChanges(collectionName, callback, options = {}) {
    const { usePolling = true, pollInterval = 1000 } = options;
    console.log(`[MongoDB] Entering watchChanges for ${collectionName}, usePolling: ${usePolling}, pollInterval: ${pollInterval}`);

    if (!usePolling) {
      try {
        const collection = this.db.collection(collectionName);
        console.log(`[MongoDB] Setting up change stream for ${collectionName}`);
        const changeStream = collection.watch({ fullDocument: "updateLookup" });
        changeStream.on("change", (change) => {
          console.log(`[MongoDB] Change detected via stream in ${collectionName}:`, change);
          callback(change);
        });
        changeStream.on("error", (err) => {
          console.error(`[MongoDB] Change stream error in ${collectionName}:`, err);
          this.startPolling(collectionName, callback, pollInterval);
        });
        return {
          close: () => {
            console.log(`[MongoDB] Closing change stream for ${collectionName}`);
            changeStream.close();
          },
        };
      } catch (err) {
        console.error(`[MongoDB] Change stream setup failed for ${collectionName}, falling back to polling:`, err);
        return this.startPolling(collectionName, callback, pollInterval);
      }
    } else {
      return this.startPolling(collectionName, callback, pollInterval);
    }
  }

  async startPolling(collectionName, callback, pollInterval) {
    this.lastTimestamp = new Date();
    console.log(`[MongoDB] Starting polling for ${collectionName} with interval ${pollInterval}ms, initial timestamp: ${this.lastTimestamp}`);

    const pollChanges = async () => {
      try {
        const collection = this.db.collection(collectionName);
        console.log(`[MongoDB] Polling ${collectionName}, checking changes since ${this.lastTimestamp}`);
        const changes = await collection
          .find({ createdAt: { $gt: this.lastTimestamp } })
          .sort({ createdAt: -1 })
          .toArray();

        if (changes.length > 0) {
          this.lastTimestamp = new Date();
          console.log(`[MongoDB] Change detected via polling in ${collectionName}:`, changes);
          callback(changes);
        } else {
          console.log(`[MongoDB] No changes detected in ${collectionName} during polling`);
        }
      } catch (err) {
        console.error(`[MongoDB] Polling error in ${collectionName}:`, err);
      }
    };

    // Azonnali első ellenőrzés
    await pollChanges();
    const interval = setInterval(pollChanges, pollInterval);
    console.log(`[MongoDB] Polling interval set for ${collectionName}`);

    return {
      close: () => {
        console.log(`[MongoDB] Stopping polling for ${collectionName}`);
        clearInterval(interval);
      },
    };
  }

  async execute(code) {
    try {
      let modifiedCode = code;
      const idMatch = code.match(/_id:\s*"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        const idValue = idMatch[1];
        console.log(`Received _id from frontend: "${idValue}"`);
        if (typeof idValue === "string" && idValue.length === 24) {
          console.log(`Converting _id value "${idValue}" to ObjectId`);
          // Szövegesen illesztjük be az ObjectId konstruktor hívást
          modifiedCode = code.replace(`_id: "${idValue}"`, `_id: new ObjectId("${idValue}")`);
        }
      }
      console.log(`Executing modified code: ${modifiedCode}`);

      // Eval helyett függvényt használunk, amely megkapja az ObjectId-t és a db-t
      const executeFn = new Function("ObjectId", "db", `
        return (async () => { return await db.${modifiedCode}; })();
      `);
      const result = await executeFn(ObjectId, this.db);

      console.log(`Execution result:`, result);
      return { status: "success", result };
    } catch (err) {
      console.error(`Execution error: ${err.message}`);
      return { status: "error", error: `MongoDB execution error: ${err.message}` };
    }
  }

  async close() {
    await this.client.close();
    console.log("MongoDB connection closed");
  }
}

class MySQLDB extends Database {
  constructor() {
    super();
    this.connection = null;
    this.lastTimestamp = null;
  }

  async connect(connectionInfo) {
    this.connection = await mysql.createConnection({
      host: connectionInfo.host || "localhost",
      user: "root",
      password: "password",
      database: "mydb",
    });
    console.log("Connected to MySQL");
  }

  async watchChanges(tableName, callback, options = {}) {
    const { pollInterval = 1000 } = options;
    this.lastTimestamp = Math.floor(Date.now() / 1000);
    console.log(`[MySQL] Starting polling for ${tableName} with interval ${pollInterval}ms`);

    const pollChanges = async () => {
      try {
        console.log(`[MySQL] Polling ${tableName}, checking changes since ${this.lastTimestamp}`);
        const [rows] = await this.connection.execute(
          `SELECT * FROM ${tableName} WHERE updated_at > FROM_UNIXTIME(?) ORDER BY updated_at DESC`,
          [this.lastTimestamp]
        );
        if (rows.length > 0) {
          this.lastTimestamp = Math.floor(Date.now() / 1000);
          console.log(`[MySQL] Change detected in ${tableName}:`, rows);
          callback(rows);
        } else {
          console.log(`[MySQL] No changes detected in ${tableName} during polling`);
        }
      } catch (err) {
        console.error(`[MySQL] Polling error in ${tableName}:`, err);
      }
    };

    await pollChanges();
    const interval = setInterval(pollChanges, pollInterval);
    console.log(`[MySQL] Polling interval set for ${tableName}`);

    return {
      close: () => {
        console.log(`[MySQL] Stopping polling for ${tableName}`);
        clearInterval(interval);
      },
    };
  }

  async execute(method) {
    try {
      const [rows] = await this.connection.execute(method);
      return { status: "success", result: rows };
    } catch (err) {
      return { status: "error", error: `MySQL execution error: ${err.message}` };
    }
  }

  async close() {
    await this.connection.end();
    console.log("MySQL connection closed");
  }
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  const channelClients = new Map();
  const clientDatabases = new Map();

  io.on("connection", (socket) => {
    console.log("Client connected: ", socket.id);

    socket.on("initialize", async ({ dbType, connectionInfo }) => {
      let db;
      if (dbType === "mongodb") {
        db = new MongoDB();
      } else if (dbType === "mysql") {
        db = new MySQLDB();
      } else {
        socket.emit("error", { message: "Unsupported database type" });
        return;
      }

      try {
        await db.connect(connectionInfo);
        clientDatabases.set(socket.id, db);
        console.log(`Database initialized for client ${socket.id}: ${dbType}`);
      } catch (err) {
        console.error("Database connection error:", err);
        socket.emit("error", { message: "Failed to connect to database" });
      }
    });

    socket.on("listen", (channel) => {
      if (!channelClients[channel]) {
        channelClients[channel] = new Set();
      }
      channelClients[channel].add(socket.id);
      socket.join(channel);
    })

    socket.on("action", async (data) => {
      const { action, channel, code, method } = data;
      const db = clientDatabases.get(socket.id);
      if (!db) {
        socket.emit("error", { message: "Database not initialized" });
        return;
      }

      if (action === "execute" && code) {
        const rawResponse = await db.execute(code);
        console.log(`Database action ${method} on ${channel}:`, rawResponse);

        let response;
        if (db instanceof MongoDB) {
          switch (method) {
            case "insert":
              response = {
                status: rawResponse.status,
                result: { insertedId: rawResponse.result.insertedId },
              };
              break;
            case "delete":
              response = {
                status: rawResponse.status,
                result: { id: code.match(/_id: "([^"]+)"/)?.[1], deletedCount: rawResponse.result.deletedCount},
              };
              break;
            case "update":
              response = {
                status: rawResponse.status,
                result: {
                  updatedId: code.match(/_id: "([^"]+)"/)?.[1],
                  updatedDoc: rawResponse.result,
                },
              };
              break;
            case "get":
              response = rawResponse; // A teljes eredményt visszaadjuk
              break;
            default:
              response = rawResponse;
          }
        } else if (db instanceof MySQLDB) {
          switch (method) {
            case "insert":
              response = {
                status: rawResponse.status,
                result: { insertId: rawResponse.result.insertId },
              };
              break;
            case "delete":
              response = {
                status: rawResponse.status,
                result: { affectedRows: rawResponse.result.affectedRows },
              };
              break;
            case "update":
              response = {
                status: rawResponse.status,
                result: { affectedRows: rawResponse.result.affectedRows },
              };
              break;
            case "get":
              response = rawResponse; // A teljes eredményt visszaadjuk
              break;
            default:
              response = rawResponse;
          }
        }

        // A kliensnek és a csatornára feliratkozott összes kliensnek elküldjük a választ
        socket.emit(`${channel}:result`, response);
        if (channelClients[channel]) {
          channelClients[channel].forEach((clientId) => {
            if (clientId !== socket.id) { // Elkerüljük a duplikált küldést az eredeti kliensnek
              io.to(clientId).emit(`${channel}`, response);
            }
          });
        }
      }
    });

    socket.on("unsubscribe", (channel) => {
      if (channelClients[channel]) {
        channelClients[channel].delete(socket.id);
        if (channelClients[channel].size === 0) {
          delete channelClients[channel];
        }
      }
      socket.leave(channel);
    });

    socket.on("message", (data) => {
      const { channel, message } = data;
      channelClients[channel]?.forEach((clientId) => {
        io.to(clientId).emit(channel, { message });
      });
    });

    socket.on("subscribe", (channel) => {
      if (!channelClients[channel]) {
        channelClients[channel] = new Set();
      }
      channelClients[channel].add(socket.id);
      socket.join(channel);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected: ", socket.id);
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