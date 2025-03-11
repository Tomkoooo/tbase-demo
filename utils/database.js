import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

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
        const existingUser = await this.db
          .collection("users")
          .findOne({ email });
        if (existingUser) throw new Error("User already exists");
        const result = await this.db.collection("users").insertOne({
          email,
          password: hashedPassword,
          createdAt: new Date(),
        });

        return result.insertedId;
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );
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
        if (!user || !bcrypt.compare(password, user.password)) {
          throw new Error("Invalid credentials");
        }
        console.log("User signed in:", user);
        return { _id: user._id.toString(), email: user.email };
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );
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
        const user = await this.db
          .collection("users")
          .findOne(
            { _id: this.toObjectId(userId) },
            { projection: { password: 0 } }
          );
        if (!user) throw new Error("User not found");
        return {
          _id: user._id.toString(),
          email: user.email,
          createdAt: user.createdAt,
        };
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

  async getSession(token) {
    try {
      if (this.type === "mongodb" && this.db) {
        if (token) {
          const session = await this.db.collection("sessions").findOne({ token });
          if (!session) return null;
          return {
            userId: session.userId,
            token: session.token,
            data: session.data,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          };
        } else {
          const sessions = await this.db.collection("sessions").find({ userId }).toArray();
          return sessions.map((s) => ({
            userId: s.userId,
            token: s.token,
            data: s.data,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          }));
        }
      } else if (this.type === "mysql" && this.db) {
        if (token) {
          const [rows] = await this.db.execute(
            "SELECT user_id AS userId, token, data, created_at AS createdAt, updated_at AS updatedAt FROM sessions WHERE user_id = ? AND token = ?",
            [userId, token]
          );
          if (rows.length === 0) return null;
          const session = rows[0];
          return {
            userId: session.userId,
            token: session.token,
            data: session.data ? JSON.parse(session.data) : null,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          };
        } else {
          const [rows] = await this.db.execute(
            "SELECT user_id AS userId, token, data, created_at AS createdAt, updated_at AS updatedAt FROM sessions WHERE user_id = ?",
            [userId]
          );
          return rows.map((r) => ({
            userId: r.userId,
            token: r.token,
            data: r.data ? JSON.parse(r.data) : null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          }));
        }
      }
      throw new Error("Database not initialized");
    } catch (err) {
      throw new Error(err.message || "Error getting session");
    }
  }

  async getSessions(userId) {
    try {
      if (this.type === "mongodb" && this.db) {
        const sessions = await this.db.collection("sessions").find({ userId }).toArray();
        if (sessions.length === 0) throw new Error("Sessions not found");
        return sessions
      } else if (this.type === "mysql" && this.db) {
        const [rows] = await this.db.execute(
          "SELECT user_id AS userId, token, data, created_at AS createdAt, updated_at AS updatedAt FROM sessions WHERE user_id = ?",
          [userId]
        );
        if (rows.length === 0) throw new Error("Sessions not found");
        return rows
      }
      throw new Error("Database not initialized");
    } catch (err) {
      throw new Error(err.message || "Error retrieving sessions");
    }
  }

  async setSession(userId, token) {
    try {
      if (this.type === "mongodb" && this.db) {
        await this.db.collection("sessions").insertOne({
          userId,
          token,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (this.type === "mysql" && this.db) {
        await this.db.execute(
          "INSERT INTO sessions (user_id, token, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
          [userId, token]
        );
      } else {
        throw new Error("Database not initialized");
      }
    } catch (err) {
      throw new Error(err.message || "Error setting session");
    }
  }

  async killSession(token) {
    try {
      if (this.type === "mongodb" && this.db) {
        console.log("token", token);
        const result = await this.db.collection("sessions").deleteOne({ token });
        if (result.deletedCount === 0) throw new Error("Session not found");
      } else if (this.type === "mysql" && this.db) {
        const [result] = await this.db.execute(
          "DELETE FROM sessions WHERE token = ?",
          [token]
        );
        if (result.affectedRows === 0) throw new Error("Session not found");
      } else {
        throw new Error("Database not initialized");
      }
    } catch (err) {
      throw new Error(err.message || "Error killing session");
    }
  }

  async killSessions(userId) {
    try {
      if (this.type === "mongodb" && this.db) {
        const result = await this.db.collection("sessions").deleteMany({ userId });
        if (result.deletedCount === 0) throw new Error("Session not found");
      } else if (this.type === "mysql" && this.db) {
        const [result] = await this.db.execute(
          "DELETE FROM sessions WHERE user_id = ? AND token = ?",
          [userId, token]
        );
        if (result.affectedRows === 0) throw new Error("Session not found");
      } else {
        throw new Error("Database not initialized");
      }
    } catch (err) {
      throw new Error(err.message || "Error killing session");
    }
  }

  async changeSession(token, data) {
    try {
      if (this.type === "mongodb" && this.db) {
        const result = await this.db.collection("sessions").updateOne(
          { token },
          { $set: { token: data, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) throw new Error("Session not found");
      } else if (this.type === "mysql" && this.db) {
        const [result] = await this.db.execute(
          "UPDATE sessions SET token = ?, updated_at = NOW() WHERE token = ?",
          [data, token]
        );
        if (result.affectedRows === 0) throw new Error("Session not found");
      } else {
        throw new Error("Database not initialized");
      }
    } catch (err) {
      throw new Error(err.message || "Error changing session");
    }
  }

  //get a specific user
  async getUser(userId) {
    try {
      if (this.type === "mongodb") {
        const user = await this.db.collection("users").findOne({ _id: this.toObjectId(userId) });
        if (!user) throw new Error("User not found");
        return {
          user
        };
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute("SELECT * FROM users WHERE id = ?", [userId]);
        if (rows.length === 0) throw new Error("User not found");
        return rows[0];
      }
    } catch (err) {
      throw new Error(err.message || "Error retrieving user");
    }
  }
 // get multiple usrs
async getUsers(userIds){
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error("userIds must be a non-empty array");
      }
  
      if (this.type === "mongodb") {
        const users = await this.db
          .collection("users")
          .find({ _id: { $in: userIds.map((id) => this.toObjectId(id)) } })
          .toArray();
        if (users.length === 0) throw new Error("Users not found");
        return users
      } else if (this.type === "mysql" && this.db) {
        const placeholders = userIds.map(() => "?").join(", ");
        const query = `SELECT id AS _id, email, created_at AS createdAt FROM users WHERE id IN (${placeholders})`;
        const [rows] = await this.db.execute(query, userIds);
        if (rows.length === 0) throw new Error("Users not found");
        return rows;
      }
      throw new Error("Database not initialized");
    } catch (err) {
      console.error("Error in getUsers:", err);
      throw new Error(err instanceof Error ? err.message : "Error retrieving users");
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
          modifiedCode = code.replace(
            `_id: "${idValue}"`,
            `_id: new ObjectId("${idValue}")`
          );
        }
      }
      console.log(`Executing modified code: ${modifiedCode}`);

      // Eval helyett függvényt használunk, amely megkapja az ObjectId-t és a db-t
      const executeFn = new Function(
        "ObjectId",
        "db",
        `
          return (async () => { return await db.${modifiedCode}; })();
        `
      );
      const result = await executeFn(ObjectId, this.db);
      return { status: "success", result };
    } catch (err) {
      console.error(`Execution error: ${err.message}`);
      return {
        status: "error",
        error: `MongoDB execution error: ${err.message}`,
      };
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
    //create sessions and users table if not exist
    await this.db.execute(
      "CREATE TABLE IF NOT EXISTS sessions (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, token TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)"
    );
  }

  async watchChanges(tableName, callback, options = {}) {
    const { pollInterval = 1000 } = options;
    this.lastTimestamp = Math.floor(Date.now() / 1000);
    console.log(
      `[MySQL] Starting polling for ${tableName} with interval ${pollInterval}ms`
    );

    const pollChanges = async () => {
      try {
        console.log(
          `[MySQL] Polling ${tableName}, checking changes since ${this.lastTimestamp}`
        );
        const [rows] = await this.db.execute(
          `SELECT * FROM ${tableName} WHERE updated_at > FROM_UNIXTIME(?) ORDER BY updated_at DESC`,
          [this.lastTimestamp]
        );
        if (rows.length > 0) {
          this.lastTimestamp = Math.floor(Date.now() / 1000);
          console.log(`[MySQL] Change detected in ${tableName}:`, rows);
          callback(rows);
        } else {
          console.log(
            `[MySQL] No changes detected in ${tableName} during polling`
          );
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
      return {
        status: "error",
        error: `MySQL execution error: ${err.message}`,
      };
    }
  }

  async close() {
    await this.db.end();
    console.log("MySQL connection closed");
  }
}

export { Database, MongoDB, MySQLDB };
