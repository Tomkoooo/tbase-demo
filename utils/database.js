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

//---- Account Scope ----

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
          teams: [],
          labels: [],
          verified: false,
        });

        return result.insertedId;
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );
        if (rows.length > 0) throw new Error("User already exists");
        const [result] = await this.db.execute(
          "INSERT INTO users (email, password) VALUES (?, ?)",
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
        const csrUser = {_id: user._id, ...user}
        return { user: csrUser };
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );
        const user = rows[0];
        if (!user || !bcrypt.compare(password, user.password)) {
          throw new Error("Invalid credentials");
        }
        return { user};
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
          user
        };
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(
          "SELECT * FROM users WHERE id = ?",
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
            "SELECT * FROM sessions WHERE token = ?",
            [token]
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
          "SELECT * FROM sessions WHERE user_id = ?",
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
          "INSERT INTO sessions (user_id, token) VALUES (?, ?)",
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
          "UPDATE sessions SET token = ?, WHERE token = ?",
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
//---- User Scope ----

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
  
  async listUsers() {
    try {
      if (this.type === "mongodb") {
        const users = await this.db.collection("users").find({}).toArray();
        return users;
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute("SELECT * FROM users");
        console.log("Rows:", rows);
        return rows;
      }
    } catch (err) {
      throw new Error(err.message || "Error listing users");
    }
  }

//---- Notification ----

  // Store a new subscription
  async storeSubscription(userId, subscription) {
    if (this.type === 'mongodb') {
      const subscriptionDoc = {
        userId,
        subscription,
        createdAt: new Date(),
      };
      const result = await this.db.collection('push_subscriptions').insertOne(subscriptionDoc);
      console.log(`Stored subscription for ${userId} in MongoDB`);
      return result.insertedId;
    } else if (this.type === 'mysql') {
      const subscriptionStr = JSON.stringify(subscription);
      const [result] = await this.db.execute(
        'INSERT INTO push_subscriptions (user_id, subscription, created_at) VALUES (?, ?, NOW())',
        [userId, subscriptionStr]
      );
      console.log(`Stored subscription for ${userId} in MySQL`);
      return result.insertId;
    } else {
      throw new Error(`Unsupported DB type: ${this.type}`);
    }
  }

  // Upsert a record (update or insert)
  async upsert(table, data) {
    if (this.type === 'mongodb') {
      const result = await this.db.collection(table).updateOne(
        { userId: data.userId },
        { $set: { subscription: data.subscription, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log(`Upserted into ${table} in MongoDB:`, data);
      return result;
    } else if (this.type === 'mysql') {
      const subscriptionStr = JSON.stringify(data.subscription);
      const [result] = await this.db.execute(
        `INSERT INTO ${table} (user_id, subscription, created_at) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE subscription = ?, updated_at = NOW()`,
        [data.userId, subscriptionStr, subscriptionStr]
      );
      console.log(`Upserted into ${table} in MySQL:`, data);
      return result;
    } else {
      throw new Error(`Unsupported DB type: ${this.type}`);
    }
  }

  // Delete a record
  async delete(table, query) {
    if (this.type === 'mongodb') {
      const result = await this.db.collection(table).deleteOne({
        userId: query.userId,
        subscription: query.subscription,
      });
      console.log(`Deleted from ${table} in MongoDB:`, query);
      return { deletedCount: result.deletedCount };
    } else if (this.type === 'mysql') {
      const subscriptionStr = JSON.stringify(query.subscription);
      const [result] = await this.db.execute(
        `DELETE FROM ${table} WHERE user_id = ? AND subscription = ?`,
        [query.userId, subscriptionStr]
      );
      console.log(`Deleted from ${table} in MySQL:`, query);
      return { affectedRows: result.affectedRows };
    } else {
      throw new Error(`Unsupported DB type: ${this.type}`);
    }
  }

  // Find records
  async find(table, query) {
    if (this.type === 'mongodb') {
      const results = await this.db.collection(table).find(query).toArray();
      console.log(`Found in ${table} in MongoDB:`, results);
      return results;
    } else if (this.type === 'mysql') {
      let sql = `SELECT * FROM ${table}`;
      let params = [];
      if (Object.keys(query).length > 0) {
        sql += ' WHERE user_id = ?';
        params.push(query.userId);
      }
      const [rows] = await this.db.execute(sql, params);
      const parsedRows = rows.map(row => ({
        userId: row.user_id,
        subscription: JSON.parse(row.subscription),
        createdAt: row.created_at,
      }));
      console.log(`Found in ${table} in MySQL:`, parsedRows);
      return parsedRows;
    } else {
      throw new Error(`Unsupported DB type: ${this.type}`);
    }
  }

// ------ Bucket API ------

  // Create a new bucket
  async createBucket() {
    try {
      let bucketId = Math.random().toString(36).substring(2, 15);
      if (this.type === "mongodb") {
        this.db.createCollection(`bucket_${bucketId}`);
        console.log(`Created MongoDB bucket: bucket_${bucketId}`);
        return `bucket_${bucketId}`;
      } else if (this.type === "mysql") {
        let [rows] = await this.db.execute(`SHOW TABLES LIKE 'bucket_${bucketId}'`);
        while (rows.length > 0) {
          bucketId = Math.random().toString(36).substring(2, 15);
          [rows] = await this.db.execute(`SHOW TABLES LIKE 'bucket_${bucketId}'`);
        }
        await this.db.execute(`
          CREATE TABLE bucket_${bucketId} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(255) NOT NULL,
            file_data LONGBLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log(`Created MySQL bucket: bucket_${bucketId}`);
        return `bucket_${bucketId}`;
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error creating bucket");
    }
  }

  // Upload a file to a bucket
  async uploadFile(bucketId, file) {
    try {
      const { name: fileName, type: fileType, data: fileData } = file; // Expecting { name, type, data } structure
      if (!fileName || !fileType || !fileData) {
        throw new Error("File name, type, and data are required");
      }

      if (this.type === "mongodb") {
        const result = await this.db.collection(bucketId).insertOne({
          file_name: fileName,
          file_type: fileType,
          file_data: Buffer.from(fileData), // Convert to Buffer for MongoDB
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`Uploaded file ${fileName} to ${bucketId} in MongoDB`);
        return result.insertedId;
      } else if (this.type === "mysql") {
        const [result] = await this.db.execute(`
          INSERT INTO ${bucketId} (file_name, file_type, file_data)
          VALUES (?, ?, ?)
        `, [fileName, fileType, fileData]); // fileData should be a Buffer or binary string
        console.log(`Uploaded file ${fileName} to ${bucketId} in MySQL`);
        return result.insertId;
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error uploading file to bucket");
    }
  }

  // Retrieve a file from a bucket by ID
  async getFile(bucketId, fileId) {
    try {
      if (this.type === "mongodb") {
        const file = await this.db.collection(bucketId).findOne({ _id: this.toObjectId(fileId) });
        if (!file) throw new Error("File not found");
        console.log(`Retrieved file ${file.file_name} from ${bucketId} in MongoDB`);
        return {
          fileName: file.file_name,
          fileType: file.file_type,
          fileData: file.file_data.buffer, // Return Buffer as-is
        };
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(`
          SELECT file_name, file_type, file_data
          FROM ${bucketId}
          WHERE id = ?
        `, [fileId]);
        if (rows.length === 0) throw new Error("File not found");
        const file = rows[0];
        console.log(`Retrieved file ${file.file_name} from ${bucketId} in MySQL`);
        return {
          fileName: file.file_name,
          fileType: file.file_type,
          fileData: file.file_data, // LONGBLOB as Buffer
        };
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error retrieving file from bucket");
    }
  }

  // List all files in a bucket
  async listFiles(bucketId) {
    try {
      if (this.type === "mongodb") {
        const files = await this.db.collection(bucketId).find().toArray();
        console.log(`Listed ${files.length} files in ${bucketId} in MongoDB`);
        return files.map(file => ({
          id: file._id,
          fileName: file.file_name,
          fileType: file.file_type,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
        }));
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(`
          SELECT id, file_name, file_type, created_at, updated_at
          FROM ${bucketId}
        `);
        console.log(`Listed ${rows.length} files in ${bucketId} in MySQL`);
        return rows.map(row => ({
          id: row.id,
          fileName: row.file_name,
          fileType: row.file_type,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error listing files in bucket");
    }
  }

  // Delete a file from a bucket
  async deleteFile(bucketId, fileId) {
    try {
      if (this.type === "mongodb") {
        const result = await this.db.collection(bucketId).deleteOne({ _id: this.toObjectId(fileId) });
        if (result.deletedCount === 0) throw new Error("File not found");
        console.log(`Deleted file ${fileId} from ${bucketId} in MongoDB`);
        return true;
      } else if (this.type === "mysql") {
        const [result] = await this.db.execute(`
          DELETE FROM ${bucketId}
          WHERE id = ?
        `, [fileId]);
        if (result.affectedRows === 0) throw new Error("File not found");
        console.log(`Deleted file ${fileId} from ${bucketId} in MySQL`);
        return true;
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error deleting file from bucket");
    }
  }

  async listBuckets() {
    try {
      if (this.type === "mongodb") {
        const collections = await this.db.listCollections().toArray();
        const buckets = collections
          .filter((col) => col.name.startsWith("bucket_"))
          .map((col) => col.name);
        console.log(`Listed ${buckets.length} buckets in MongoDB`);
        return buckets;
      } else if (this.type === "mysql") {
        const [rows] = await this.db.execute(`SHOW TABLES`);
        const buckets = rows
          .map((row) => Object.values(row)[0])
          .filter((tableName) => tableName.startsWith("bucket_"));
        console.log(`Listed ${buckets.length} buckets in MySQL`);
        return buckets;
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error listing buckets");
    }
  }

  async deleteBucket(bucketId) {
    try {
      if (!bucketId.startsWith("bucket_")) {
        throw new Error("Invalid bucket ID: must start with 'bucket_'");
      }
      if (this.type === "mongodb") {
        await this.db.collection(bucketId).drop();
        console.log(`Deleted bucket ${bucketId} in MongoDB`);
        return true;
      } else if (this.type === "mysql") {
        await this.db.execute(`DROP TABLE ${bucketId}`);
        console.log(`Deleted bucket ${bucketId} in MySQL`);
        return true;
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error deleting bucket");
    }
  }

  async renameBucket(oldBucketId, newBucketId) {
    try {
      if (!oldBucketId.startsWith("bucket_") || !newBucketId.startsWith("bucket_")) {
        throw new Error("Invalid bucket ID: must start with 'bucket_'");
      }
      if (oldBucketId === newBucketId) {
        throw new Error("New bucket ID must be different from the old one");
      }

      if (this.type === "mongodb") {
        await this.db.collection(oldBucketId).rename(newBucketId);
        console.log(`Renamed bucket ${oldBucketId} to ${newBucketId} in MongoDB`);
        return true;
      } else if (this.type === "mysql") {
        const [existing] = await this.db.execute(`SHOW TABLES LIKE '${newBucketId}'`);
        if (existing.length > 0) {
          throw new Error(`Bucket ${newBucketId} already exists`);
        }

        await this.db.execute(`
          CREATE TABLE ${newBucketId} LIKE ${oldBucketId}
        `);
        await this.db.execute(`
          INSERT INTO ${newBucketId} SELECT * FROM ${oldBucketId}
        `);
        await this.db.execute(`DROP TABLE ${oldBucketId}`);
        console.log(`Renamed bucket ${oldBucketId} to ${newBucketId} in MySQL`);
        return true;
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (err) {
      throw new Error(err.message || "Error renaming bucket");
    }
  }

  // execute metódus a meglévő lekérdezésekhez (opcionális)
  async execute(query) {
    if (this.type === "mongodb") {
      return eval(`(async () => { return await this.db.${query}; })()`);
    } else if (this.type === "mysql") {
      const [rows] = await this.db.query(query);
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
      user: connectionInfo.user,
      port: connectionInfo.port || 3306,
      password: connectionInfo.password || "",
      database: connectionInfo.database,
    });
    this.db.connect(err => {
      if (err) {
          console.log('Database connection error:', err);
          process.exit(1);
      }
      console.log('Connected to the database');
  });
  
    console.log("Connected to MySQL");
    //create sessions and users table if not exist
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) DEFAULT '',
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        labels JSON DEFAULT '[]',
        teams JSON DEFAULT '[]',
        verified BOOLEAN DEFAULT FALSE
      )
    `);
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await this.db.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      subscription JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
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
