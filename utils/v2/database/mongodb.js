// server/database/mongodb.js
import { MongoClient, ObjectId } from "mongodb";
import { Database } from "../database.js";
import { accountMethods } from "./methods/account.js";
import { usersMethods } from "./methods/users.js";
import { notificationMethods } from "./methods/notification.js";
import { bucketMethods } from "./methods/bucket.js";
import { permissionMethods } from "./methods/permission.js";
import { teamMethods } from "./methods/teams.js"; // Teams metódusok importálása

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

  // Team metódusok
  createTeam(data) { return teamMethods.createTeam(this.db, data); }
  getTeam(teamId) { return teamMethods.getTeam(this.db, teamId); }
  getTeams(userId) { return teamMethods.getTeams(this.db, userId); }
  updateTeam(teamId, name, styling, userId) { return teamMethods.updateTeam(this.db, teamId, name, styling, userId); }
  deleteTeam(teamId, userId) { return teamMethods.deleteTeam(this.db, teamId, userId); }
  addTeamUser(teamId, userId, role, addedBy) { return teamMethods.addTeamUser(this.db, teamId, userId, role, addedBy); }
  removeTeamUser(teamId, userId, removedBy) { return teamMethods.removeTeamUser(this.db, teamId, userId, removedBy); }
  updateTeamUserRole(teamId, userId, role, updatedBy) { return teamMethods.updateTeamUserRole(this.db, teamId, userId, role, updatedBy); }
  updateTeamUserLabels(teamId, userId, labels, updatedBy) { return teamMethods.updateTeamUserLabels(this.db, teamId, userId, labels, updatedBy); }
  getTeamUserRole(teamId, userId) { return teamMethods.getTeamUserRole(this.db, teamId, userId); }
  listTeams() { return teamMethods.listTeams(this.db); }
  checkTeamPermission(teamId, userId, requiredPermission) { return teamMethods.checkTeamPermission(this.db, teamId, userId, requiredPermission); }
  evaluateTeamPermission(teamId, userId, expression) { return teamMethods.evaluateTeamPermission(this.db, teamId, userId, expression); }

  // Permission metódusok
  createPermission(itemId, requireAction, requireRole) { return permissionMethods.createPermission(this.db, itemId, requireAction, requireRole); }
  getPermission(permissionId) { return permissionMethods.getPermission(this.db, permissionId); }
  getPermissions(itemId) { return permissionMethods.getPermissions(this.db, itemId); }
  updatePermission(permissionId, itemId, requireAction, requireRole) { return permissionMethods.updatePermission(this.db, permissionId, itemId, requireAction, requireRole); }
  deletePermission(permissionId) { return permissionMethods.deletePermission(this.db, permissionId); }
  createUserPermission(userId, onDoc, permission) { return permissionMethods.createUserPermission(this.db, userId, onDoc, permission); }
  getUserPermissions(userId, onDoc) { return permissionMethods.getUserPermissions(this.db, userId, onDoc); }
  updateUserPermission(permissionId, onDoc, permission) { return permissionMethods.updateUserPermission(this.db, permissionId, onDoc, permission); }
  deleteUserPermission(permissionId) { return permissionMethods.deleteUserPermission(this.db, permissionId); }
  checkUserPermission(userId, onDoc, requiredPermission) { return permissionMethods.checkUserPermission(this.db, userId, onDoc, requiredPermission); }
  evaluateUserPermission(userId, onDoc, expression) { return permissionMethods.evaluateUserPermission(this.db, userId, onDoc, expression); }

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