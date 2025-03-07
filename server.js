// server.js
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";

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

  async execute(method) {
    try {
      const result = await eval(`(async () => { return await this.db.${method}; })()`);
      return { status: "success", result };
    } catch (err) {
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
      const { action, channel, method } = data;
      const db = clientDatabases.get(socket.id);
      if (!db) {
        socket.emit("error", { message: "Database not initialized" });
        return;
      }

      if (action === "execute" && method) {
        const response = await db.execute(method);
        socket.emit(`${channel}:result`, response);
      }
      //for each user that listen to the collection we emit the message
      channelClients[channel]?.forEach((clientId) => {
        io.to(clientId).emit(channel, { action, method });
      });
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