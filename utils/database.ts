// database.ts
import { MongoClient, Db, ObjectId } from "mongodb";
import mysql, { Connection } from "mysql2/promise";
import bcrypt from "bcryptjs";

// Define connection info interfaces
export interface MongoConnectionInfo {
  url: string;
  dbName?: string;
}

export interface MySQLConnectionInfo {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
}

// Generic payload for signup/signin
export interface AuthPayload {
  email: string;
  password: string;
}

// User data returned from signin/getAccount
export interface UserData {
  _id: string;
  email: string;
  createdAt?: Date;
}

// Session data
export interface SessionData {
  userId: string;
  data: any;
  updatedAt?: Date;
}

abstract class Database {
  protected type: "mongo" | "mysql";
  protected connection: MongoConnectionInfo | MySQLConnectionInfo;
  protected db: Db | Connection | null = null;

  constructor(type: "mongo" | "mysql", connection: MongoConnectionInfo | MySQLConnectionInfo) {
    this.type = type;
    this.connection = connection;
  }

  abstract connect(connectionInfo: MongoConnectionInfo | MySQLConnectionInfo): Promise<void>;
  abstract watchChanges(
    collectionName: string,
    callback: (changes: any) => void,
    options?: { pollInterval?: number }
  ): Promise<{ close: () => void } | void>;
  abstract execute(query: string): Promise<{ status: "success" | "error"; result?: any; error?: string }>;
  abstract close(): Promise<void>;

  protected toObjectId(id: string): ObjectId | string {
    return this.type === "mongo" ? new ObjectId(id) : id;
  }

  async signUp(payload: AuthPayload): Promise<string> {
    try {
      const { email, password } = payload;
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      if (this.type === "mongo" && this.db) {
        const existingUser = await (this.db as Db).collection("users").findOne({ email });
        if (existingUser) throw new Error("User already exists");
        const result = await (this.db as Db).collection("users").insertOne({
          email,
          password: hashedPassword,
          createdAt: new Date(),
        });
        return result.insertedId.toString();
      } else if (this.type === "mysql" && this.db) {
        const [rows] = await (this.db as Connection).execute<any[]>("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length > 0) throw new Error("User already exists");
        const [result] = await (this.db as Connection).execute<any>(
          "INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())",
          [email, hashedPassword]
        );
        return (result as any).insertId.toString();
      }
      throw new Error("Database not initialized");
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error during signup");
    }
  }

  async signIn(email: string, password: string): Promise<UserData> {
    try {
      if (this.type === "mongo" && this.db) {
        const user = await (this.db as Db).collection("users").findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          throw new Error("Invalid credentials");
        }
        return { _id: user._id.toString(), email: user.email };
      } else if (this.type === "mysql" && this.db) {
        const [rows] = await (this.db as Connection).execute<any[]>("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];
        if (!user || !bcrypt.compareSync(password, user.password)) {
          throw new Error("Invalid credentials");
        }
        return { _id: user.id.toString(), email: user.email };
      }
      throw new Error("Database not initialized");
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error during signin");
    }
  }

  async getAccount(userId: string): Promise<UserData> {
    try {
      if (this.type === "mongo" && this.db) {
        const user = await (this.db as Db).collection("users").findOne(
          { _id: this.toObjectId(userId) as ObjectId },
          { projection: { password: 0 } }
        );
        if (!user) throw new Error("User not found");
        return { _id: user._id.toString(), email: user.email, createdAt: user.createdAt };
      } else if (this.type === "mysql" && this.db) {
        const [rows] = await (this.db as Connection).execute<any[]>(
          "SELECT id AS _id, email, created_at AS createdAt FROM users WHERE id = ?",
          [userId]
        );
        const user = rows[0];
        if (!user) throw new Error("User not found");
        return user;
      }
      throw new Error("Database not initialized");
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error retrieving account");
    }
  }

  async setSession(userId: string, data: any): Promise<void> {
    try {
      if (this.type === "mongo" && this.db) {
        await (this.db as Db).collection("sessions").updateOne(
          { userId },
          { $set: { data, updatedAt: new Date() } },
          { upsert: true }
        );
      } else if (this.type === "mysql" && this.db) {
        const [existing] = await (this.db as Connection).execute<any[]>("SELECT * FROM sessions WHERE user_id = ?", [userId]);
        if (existing.length > 0) {
          await (this.db as Connection).execute(
            "UPDATE sessions SET data = ?, updated_at = NOW() WHERE user_id = ?",
            [JSON.stringify(data), userId]
          );
        } else {
          await (this.db as Connection).execute(
            "INSERT INTO sessions (user_id, data, updated_at) VALUES (?, ?, NOW())",
            [userId, JSON.stringify(data)]
          );
        }
      } else {
        throw new Error("Database not initialized");
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error setting session");
    }
  }

  async killSession(userId: string): Promise<void> {
    try {
      if (this.type === "mongo" && this.db) {
        await (this.db as Db).collection("sessions").deleteOne({ userId });
      } else if (this.type === "mysql" && this.db) {
        await (this.db as Connection).execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
      } else {
        throw new Error("Database not initialized");
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error killing session");
    }
  }

  async changeSession(userId: string, data: any): Promise<void> {
    try {
      if (this.type === "mongo" && this.db) {
        const result = await (this.db as Db).collection("sessions").updateOne(
          { userId },
          { $set: { data, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) throw new Error("Session not found");
      } else if (this.type === "mysql" && this.db) {
        const [result] = await (this.db as Connection).execute<any>(
          "UPDATE sessions SET data = ?, updated_at = NOW() WHERE user_id = ?",
          [JSON.stringify(data), userId]
        );
        if ((result as any).affectedRows === 0) throw new Error("Session not found");
      } else {
        throw new Error("Database not initialized");
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error changing session");
    }
  }
}

class MongoDB extends Database {
  private client: MongoClient | null = null;
  private lastTimestamp: number | null = null;

  constructor(connectionInfo: MongoConnectionInfo) {
    super("mongo", connectionInfo);
  }

  async connect(): Promise<void> {
    this.client = new MongoClient((this.connection as MongoConnectionInfo).url);
    await this.client.connect();
    this.db = this.client.db((this.connection as MongoConnectionInfo).dbName || "mydb");
    console.log("Connected to MongoDB");
  }

  async execute(code: string): Promise<{ status: "success" | "error"; result?: any; error?: string }> {
    if (!this.db) throw new Error("Database not connected");
    try {
      let modifiedCode = code;
      const idMatch = code.match(/_id:\s*"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        const idValue = idMatch[1];
        if (typeof idValue === "string" && idValue.length === 24) {
          modifiedCode = code.replace(`_id: "${idValue}"`, `_id: new ObjectId("${idValue}")`);
        }
      }
      console.log(`Executing modified code: ${modifiedCode}`);

      const executeFn = new Function("ObjectId", "db", `
        return (async () => { return await db.${modifiedCode}; })();
      `);
      const result = await executeFn(ObjectId, this.db);
      return { status: "success", result };
    } catch (err: any) {
      console.error(`Execution error: ${err.message}`);
      return { status: "error", error: `MongoDB execution error: ${err.message}` };
    }
  }

  async watchChanges(
    collectionName: string,
    callback: (changes: any) => void,
    options: { pollInterval?: number } = {}
  ): Promise<void> {
    // Implement MongoDB change streams if needed
    throw new Error("watchChanges not implemented for MongoDB in this example");
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log("MongoDB connection closed");
    }
  }
}

class MySQLDB extends Database {
  private lastTimestamp: number | null = null;

  constructor(connectionInfo: MySQLConnectionInfo) {
    super("mysql", connectionInfo);
  }

  async connect(): Promise<void> {
    this.db = await mysql.createConnection({
      host: (this.connection as MySQLConnectionInfo).host || "localhost",
      user: (this.connection as MySQLConnectionInfo).user || "root",
      password: (this.connection as MySQLConnectionInfo).password || "",
      database: (this.connection as MySQLConnectionInfo).database || "mydb",
    });
    console.log("Connected to MySQL");
  }

  async watchChanges(
    tableName: string,
    callback: (changes: any[]) => void,
    options: { pollInterval?: number } = {}
  ): Promise<{ close: () => void }> {
    if (!this.db) throw new Error("Database not connected");
    const { pollInterval = 1000 } = options;
    this.lastTimestamp = Math.floor(Date.now() / 1000);
    console.log(`[MySQL] Starting polling for ${tableName} with interval ${pollInterval}ms`);

    const pollChanges = async () => {
      try {
        console.log(`[MySQL] Polling ${tableName}, checking changes since ${this.lastTimestamp}`);
        const [rows] = await (this.db as Connection).execute<any[]>(
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

  async execute(method: string): Promise<{ status: "success" | "error"; result?: any; error?: string }> {
    if (!this.db) throw new Error("Database not connected");
    try {
      const [rows] = await (this.db as Connection).execute<any[]>(method);
      return { status: "success", result: rows };
    } catch (err: any) {
      return { status: "error", error: `MySQL execution error: ${err.message}` };
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await (this.db as Connection).end();
      console.log("MySQL connection closed");
    }
  }
}

export { Database, MongoDB, MySQLDB };