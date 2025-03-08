// server.js
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
const SECRET_KEY = "your-secret-key";

class Database {
  async connect(connectionInfo) {}
  async watchChanges(collectionName, callback, options) {}
  async execute(method) {}
  async close() {}

  constructor(type, connection) {
    this.type = type; // "mongodb" vagy "mysql"
    this.connection = connection; // MongoDB db objektum vagy MySQL connection
  }

  // Közös segédfüggvény: ObjectId konverzió MongoDB-hez
  toObjectId(id) {
    return this.type === "mongodb" ? new ObjectId(id) : id;
  }

  // Regisztráció (signup)
  async signUp(payload) {
    try {
      const { email, password } = payload;
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      if (this.type === "mongodb") {
        const existingUser = await this.db.collection("users").findOne({ email });
        if (existingUser) throw new Error("User already exists");
        const result = await this.db.collection("users").insertOne({
          email,
          password: hashedPassword,
          createdAt: new Date(),
        });
      
        return result.insertedId;
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length > 0) throw new Error("User already exists");
        const [result] = await this.db.execute(
          "INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())",
          [email, hashedPassword]
        );
        return result.insertId.toString();
      }
    } catch (err) {
      throw new Error(err.message || "Error during signup");
    }
  }

  // Bejelentkezés (signin)
  async signIn(email, password) {
    try {
      if (this.type === "mongodb") {
        const user = await this.db.collection("users").findOne({ email });
        console.log("User found:", user.password);
        console.log("Password:", password, bcrypt.compare(password, user.password));
        if (!user || !bcrypt.compare(password, user.password)) {
          throw new Error("Invalid credentials");
        }
        console.log("User signed in:", user);
        return { _id: user._id.toString(), email: user.email };
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];
        if (!user || !bcrypt.compareSync(password, user.password)) {
          throw new Error("Invalid credentials");
        }
        return { _id: user.id.toString(), email: user.email };
      }
    } catch (err) {
      throw new Error(err.message || "Error during signin");
    }
  }

  // Felhasználó lekérdezése (getAccount)
  async getAccount(userId) {
    try {
      if (this.type === "mongodb") {
        const user = await this.db.collection("users").findOne(
          { _id: this.toObjectId(userId) },
          { projection: { password: 0 } }
        );
        if (!user) throw new Error("User not found");
        return { _id: user._id.toString(), email: user.email, createdAt: user.createdAt };
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(
          "SELECT id AS _id, email, created_at AS createdAt FROM users WHERE id = ?",
          [userId]
        );
        const user = rows[0];
        if (!user) throw new Error("User not found");
        return user;
      }
    } catch (err) {
      throw new Error(err.message || "Error retrieving account");
    }
  }

  // Munkamenet lekérdezése (getSession nem kell db művelet, JWT dekódolás elég)

  // Munkamenet beállítása (setSession)
  async setSession(userId, data) {
    try {
      if (this.type === "mongodb") {
        await this.db.collection("sessions").updateOne(
          { userId },
          { $set: { data, updatedAt: new Date() } },
          { upsert: true }
        );
      } else if (this.type === "mysql") {
        const [existing] = await this.db.execute("SELECT * FROM sessions WHERE user_id = ?", [userId]);
        if (existing.length > 0) {
          await this.db.execute(
            "UPDATE sessions SET data = ?, updated_at = NOW() WHERE user_id = ?",
            [JSON.stringify(data), userId]
          );
        } else {
          await this.db.execute(
            "INSERT INTO sessions (user_id, data, updated_at) VALUES (?, ?, NOW())",
            [userId, JSON.stringify(data)]
          );
        }
      }
    } catch (err) {
      throw new Error(err.message || "Error setting session");
    }
  }

  // Munkamenet törlése (killSession)
  async killSession(userId) {
    try {
      if (this.type === "mongodb") {
        await this.db.collection("sessions").deleteOne({ userId });
      } else if (this.type === "mysql") {
        await this.db.execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
      }
    } catch (err) {
      throw new Error(err.message || "Error killing session");
    }
  }

  // Munkamenet módosítása (changeSession)
  async changeSession(userId, data) {
    try {
      if (this.type === "mongodb") {
        const result = await this.db.collection("sessions").updateOne(
          { userId },
          { $set: { data, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) throw new Error("Session not found");
      } else if (this.type === "mysql") {
        const [result] = await this.db.execute(
          "UPDATE sessions SET data = ?, updated_at = NOW() WHERE user_id = ?",
          [JSON.stringify(data), userId]
        );
        if (result.affectedRows === 0) throw new Error("Session not found");
      }
    } catch (err) {
      throw new Error(err.message || "Error changing session");
    }
  }

  // execute metódus a meglévő lekérdezésekhez (opcionális)
  async execute(query) {
    if (this.type === "mongodb") {
      return eval(`(async () => { return await this.db.${query}; })()`);
    } else if (this.type === "mysql") {
      const [rows] = await this.db.execute(query);
      return { result: rows };
    }
  }
}

class MongoDB extends Database {
  constructor(connectionInfo) {
    super("mongodb", connectionInfo); // Explicit type átadása
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


  async execute(code) {
    try {
      let modifiedCode = code;
      const idMatch = code.match(/_id:\s*"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        const idValue = idMatch[1];
        console.log(`Received _id from frontend: "${idValue}"`);
        if (typeof idValue === "string" && idValue.length === 24) {
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
  constructor(connectionInfo) {
    super("mysql", connectionInfo);
    this.db = null;
    this.lastTimestamp = null;
  }

  async connect(connectionInfo) {
    this.db = await mysql.createConnection({
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
        const [rows] = await this.db.execute(
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
      const [rows] = await this.db.execute(method);
      return { status: "success", result: rows };
    } catch (err) {
      return { status: "error", error: `MySQL execution error: ${err.message}` };
    }
  }



  async close() {
    await this.db.end();
    console.log("MySQL connection closed");
  }
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  const channelClients = new Map();
  const clientDatabases = new Map();
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("Client connected: ", socket.id);

    socket.on("close", () => {
      //close the db connection
      clientDatabases.get(socket.id).close();
      clientDatabases.delete(socket.id);
      onlineUsers.delete(socket.id);
      channelClients.delete(socket.id);
      socket.disconnect();
    } )

    socket.on("initialize", async ({ dbType, connectionInfo }) => {
      let db;
      if (dbType === "mongodb") {
        db = new MongoDB(connectionInfo);
      } else if (dbType === "mysql") {
        db = new MySQLDB(connectionInfo);
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
              io.to(clientId).emit(`${channel}`, response);
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

    socket.on("account:action", async (data) => {
      const { action, data: payload, token } = data;
      const db = clientDatabases.get(socket.id);
  
      if (!db) {
        socket.emit("account:result", { status: "error", message: "Database not initialized" });
        return;
      }
  
      try {
        switch (action) {
          case "signup":
            try {
              const userId = await db.signUp(payload);
              if (!userId) throw new Error("Signup failed");
              console.log("User signed up:", userId.toString());
              const signupToken = jwt.sign({ userId: userId.toString(), email: payload.email }, SECRET_KEY, { expiresIn: "24h" });
              socket.emit("account:result", { status: "success", token: signupToken });
                socket.emit("account", { event: "signup", userId });
            } catch (err) {
              socket.emit("account:result", { status: "error", message: err.message });
            }
            break;
  
          case "signin":
            try {
              const user = await db.signIn(payload.email, payload.password);
              if(!user) throw new Error("User not found or invalid password");
              console.log("User signed in:", user);
              const signInToken = jwt.sign({ userId: user._id, email: user.email }, SECRET_KEY, { expiresIn: "24h" });
              socket.emit("account:result", { status: "success", token: signInToken });
                socket.emit("account", { event: "signin", userId: user._id });
            } catch (err) {
              socket.emit("account:result", { status: "error", message: err.message });
            }
            break;
  
          case "getAccount":
            if (!token) throw new Error("No token provided");
            const decodedGetAccount = jwt.verify(token, SECRET_KEY);
            try {
              const account = await db.getAccount(decodedGetAccount.userId);
              socket.emit("account:get", { status: "success", data: account });
              if (!onlineUsers.has(decodedGetAccount.userId)) {
                onlineUsers.set(decodedGetAccount.userId, socket.id);
                const onlineUserIds = Array.from(onlineUsers.keys());
                const listOnlineQuery = `collection('users').find({ _id: { $in: [${onlineUserIds.map(id => `new ObjectId("${id}")`).join(", ")}] } }).toArray()`;
                const onlineUsersResult = await db.execute(listOnlineQuery);
                const onlineUsersData = onlineUsersResult.result.map((user) => ({
                  _id: user._id.toString(),
                  email: user.email,
                  createdAt: user.createdAt,
                }));
                channelClients["users:onlineChanged"]?.forEach((clientId) => {
                  io.to(clientId).emit("users:onlineChanged", onlineUsersData);
                })
              }
                socket.emit("account:get", { event: "getAccount", userId: decodedGetAccount.userId });
              
            } catch (err) {
              socket.emit("account:get", { status: "error", message: err.message });
            }
            break;
  
          case "getSession":
            if (!token) throw new Error("No token provided");
            jwt.verify(token, SECRET_KEY, async (err, decoded) => {
              if (err) {
                socket.emit("account:session", { status: "error", message: "Invalid or expired token" });
              } else {
                socket.emit("account:session", { status: "success", data: decoded });
                if (!onlineUsers.has(decoded.userId)) {
                  onlineUsers.set(decoded.userId, socket.id);
                  const onlineUserIds = Array.from(onlineUsers.keys());
                  const listOnlineQuery = `collection('users').find({ _id: { $in: [${onlineUserIds.map(id => `new ObjectId("${id}")`).join(", ")}] } }).toArray()`;
                  const onlineUsersResult = await db.execute(listOnlineQuery);
                  const onlineUsersData = onlineUsersResult.result.map((user) => ({
                    _id: user._id.toString(),
                    email: user.email,
                    createdAt: user.createdAt,
                  }));
                  channelClients["users:onlineChanged"]?.forEach((clientId) => {
                    console.log("Emitting to client:", clientId);
                    io.to(clientId).emit("users:onlineChanged", onlineUsersData);
                  })
                }
              }
            });
            break;
  
          case "setSession":
            if (!token) throw new Error("No token provided");
            const sessionData = jwt.verify(token, SECRET_KEY);
            try {
              await db.setSession(sessionData.userId, payload);
              socket.emit("account:result", { status: "success", message: "Session set" });
            } catch (err) {
              socket.emit("account:result", { status: "error", message: err.message });
            }
            break;
  
          case "killSession":
            if (!token) throw new Error("No token provided");
            const killData = jwt.verify(token, SECRET_KEY);
            try {
              await db.killSession(killData.userId);
              socket.emit("account:result", { status: "success", message: "Session killed" });
              if (onlineUsers.has(killData.userId)) {
                onlineUsers.delete(killData.userId);
                const onlineUserIds = Array.from(onlineUsers.keys());
                const listOnlineQuery = `collection('users').find({ _id: { $in: [${onlineUserIds.map(id => `new ObjectId("${id}")`).join(", ")}] } }).toArray()`;
                const onlineUsersResult = await db.execute(listOnlineQuery);
                const onlineUsersData = onlineUsersResult.result.map((user) => ({
                  _id: user._id.toString(),
                  email: user.email,
                  createdAt: user.createdAt,
                }));
                channelClients["users:onlineChanged"]?.forEach((clientId) => {
                  io.to(clientId).emit("users:onlineChanged", onlineUsersData);
                })
              }
              channelClients["account"]?.forEach((clientId) => {
                io.to(clientId).emit("account", { event: "sessionKilled", userId: killData.userId });
              });
            } catch (err) {
              socket.emit("account:result", { status: "error", message: err.message });
            }
            break;
  
          case "changeSession":
            if (!token) throw new Error("No token provided");
            const changeData = jwt.verify(token, SECRET_KEY);
            try {
              await db.changeSession(changeData.userId, payload);
              socket.emit("account:result", { status: "success", message: "Session changed" });
            } catch (err) {
              socket.emit("account:result", { status: "error", message: err.message });
            }
            break;
  
          default:
            socket.emit("account:result", { status: "error", message: "Unknown action" });
        }
      } catch (err) {
        console.error("Account action error:", err.message);
        socket.emit("account:result", { status: "error", message: err.message || "Unexpected error" });
      }
    });

    // USERS SCOPE
    socket.on("users:action", async (data) => {
      const { action, token } = data;
      const db = clientDatabases.get(socket.id);

      if (!db) {
        socket.emit("users:result", { status: "error", message: "Database not initialized" });
        return;
      }

      if (!token) {
        socket.emit("users:result", { status: "error", message: "No token provided" });
        return;
      }

      try {
        const decoded = jwt.verify(token, SECRET_KEY);

        switch (action) {
          case "listAll":
            const listAllQuery = `collection('users').find().toArray()`;
            const allUsersResult = await db.execute(listAllQuery);
            const allUsers = allUsersResult.result.map((user) => ({
              _id: user._id.toString(),
              email: user.email,
              createdAt: user.createdAt,
            }));
            socket.emit("users:result", { status: "success", data: allUsers });
            break;

          case "listOnline":
            const onlineUserIds = Array.from(onlineUsers.keys());
            const listOnlineQuery = `collection('users').find({ _id: { $in: [${onlineUserIds.map(id => `new ObjectId("${id}")`).join(", ")}] } }).toArray()`;
            const onlineUsersResult = await db.execute(listOnlineQuery);
            const onlineUsersData = onlineUsersResult.result.map((user) => ({
              _id: user._id.toString(),
              email: user.email,
              createdAt: user.createdAt,
            }));
            console.log("Online users:", onlineUsersData, onlineUsersResult);
            socket.emit("users:online", { status: "success", data: onlineUsersData });
            break;

          default:
            socket.emit("users:result", { status: "error", message: "Unknown action" });
        }
      } catch (err) {
        console.error("Users action error:", err.message);
        socket.emit("users:result", { status: "error", message: err.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected: ", socket.id);
      clientDatabases.get(socket.id)?.close();
      clientDatabases.delete(socket.id);
      for (const [userId, socketId] of onlineUsers) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          io.emit("users:onlineChanged", Array.from(onlineUsers.keys()));
          break;
        }
      }
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