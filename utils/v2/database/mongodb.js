// server/database/mongodb.js
import { MongoClient, ObjectId } from "mongodb";
import { Database } from "./base.js";
import { accountMethods } from "./methods/account.js";
import { usersMethods } from "./methods/users.js";
import { notificationMethods } from "./methods/notification.js";
import { bucketMethods } from "./methods/bucket.js"; // Bucket metódusok importálása

export class MongoDB extends Database {
  constructor() {
    super();
    this.client = null;
    this.db = null;
  }

  async connect(connectionInfo) {
    this.client = new MongoClient(connectionInfo.url || "mongodb://localhost:27017");
    await this.client.connect();
    this.db = this.client.db(connectionInfo.dbName || "mydb");
    console.log("Connected to MongoDB");
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("MongoDB connection closed");
    }
  }

  async execute(query, method) {
    try {
      let modifiedQuery = query;
      const idMatch = query.match(/_id:\s*"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        const idValue = idMatch[1];
        if (typeof idValue === "string" && idValue.length === 24) {
          modifiedQuery = query.replace(
            `_id: "${idValue}"`,
            `_id: new ObjectId("${idValue}")`
          );
        }
      }
      console.log(`Executing query: ${modifiedQuery}`);

      const executeFn = new Function(
        "ObjectId",
        "db",
        `return (async () => { return await db.${modifiedQuery}; })();`
      );
      const rawResult = await executeFn(ObjectId, this.db);

      let result;
      switch (method) {
        case "insert":
          result = { insertedId: rawResult.insertedId, insertedDoc: rawResult.ops?.[0] };
          break;
        case "delete":
          result = { id: idMatch?.[1], deletedCount: rawResult.deletedCount };
          break;
        case "update":
          result = { updatedId: idMatch?.[1], updatedDoc: rawResult.value };
          break;
        case "get":
          result = rawResult instanceof Array ? rawResult : [rawResult];
          break;
        default:
          result = rawResult;
      }

      return { status: "success", method, result };
    } catch (err) {
      return { status: "error", method, error: `MongoDB execution error: ${err.message}` };
    }
  }

  // Bucket metódusok
  createBucket() { return bucketMethods.createBucket(this.db); }
  uploadFile(bucketId, file) { return bucketMethods.uploadFile(this.db, bucketId, file); }
  getFile(bucketId, fileId) { return bucketMethods.getFile(this.db, bucketId, fileId); }
  listFiles(bucketId) { return bucketMethods.listFiles(this.db, bucketId); }
  deleteFile(bucketId, fileId) { return bucketMethods.deleteFile(this.db, bucketId, fileId); }
  listBuckets() { return bucketMethods.listBuckets(this.db); }
  deleteBucket(bucketId) { return bucketMethods.deleteBucket(this.db, bucketId); }
  renameBucket(oldBucketId, newBucketId) { return bucketMethods.renameBucket(this.db, oldBucketId, newBucketId); }

  // Notification metódusok
  storeSubscription(userId, subscription) { return notificationMethods.storeSubscription(this.db, userId, subscription); }
  upsert(table, data) { return notificationMethods.upsert(this.db, table, data); }
  delete(table, query) { return notificationMethods.delete(this.db, table, query); }
  find(table, query) { return notificationMethods.find(this.db, table, query); }

  // Account metódusok
  signUp(payload) { return accountMethods.signUp(this.db, payload); }
  signIn(user, password, isSuper) { return accountMethods.signIn(this.db, user, password, isSuper); }
  getUser(userId) { return accountMethods.getUser(this.db, userId); }
  getSession(token, jwtSecret) { return accountMethods.getSession(this.db, token, jwtSecret); }
  getSessions(token, jwtSecret) { return accountMethods.getSessions(this.db, token, jwtSecret); }
  killSession(token, sessionId, jwtSecret) { return accountMethods.killSession(this.db, token, sessionId, jwtSecret); }
  killSessions(token, jwtSecret) { return accountMethods.killSessions(this.db, token, jwtSecret); }
  getLabels(token, jwtSecret) { return accountMethods.getLabels(this.db, token, jwtSecret); }
  setLabels(token, labels, jwtSecret) { return accountMethods.setLabels(this.db, token, labels, jwtSecret); }
  deleteLabels(token, jwtSecret) { return accountMethods.deleteLabels(this.db, token, jwtSecret); }
  getPreferences(token, jwtSecret) { return accountMethods.getPreferences(this.db, token, jwtSecret); }
  setPreferences(token, preferences, jwtSecret) { return accountMethods.setPreferences(this.db, token, preferences, jwtSecret); }
  updatePreferences(token, key, value, jwtSecret) { return accountMethods.updatePreferences(this.db, token, key, value, jwtSecret); }
  deletePreferences(token, key, jwtSecret) { return accountMethods.deletePreferences(this.db, token, key, jwtSecret); }

  // Users metódusok
  listAll() { return usersMethods.listAll(this.db); }
  listOnline(onlineUsers) { return usersMethods.listOnline(this.db, onlineUsers); }
  getUserById(userId) { return usersMethods.getUser(this.db, userId); }
  getUsersFromId(userIds) { return usersMethods.getUsersFromId(this.db, userIds); }
  setUserLabels(userId, labels) { return usersMethods.setLabels(this.db, userId, labels); }
  getUserLabels(userId) { return usersMethods.getLabels(this.db, userId); }
  deleteUserLabels(userId) { return usersMethods.deleteLabels(this.db, userId); }
  setUserPreference(userId, key, value) { return usersMethods.setPreference(this.db, userId, key, value); }
  updateUserPreference(userId, key, value) { return usersMethods.updatePreference(this.db, userId, key, value); }
  deleteUserPreferenceKey(userId, key) { return usersMethods.deletePreferenceKey(this.db, userId, key); }
  getUserPreferences(userId) { return usersMethods.getPreferences(this.db, userId); }
  deleteUser(userId) { return usersMethods.deleteUser(this.db, userId); }
  createUser(payload) { return usersMethods.createUser(this.db, payload); }
}