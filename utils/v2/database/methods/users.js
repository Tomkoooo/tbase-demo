// database/methods/users.js
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export const usersMethods = {
  async listAll(db) {
    return await db.collection("users").find().toArray();
  },

  async listOnline(db, onlineUsers) {
    const userIds = Array.from(onlineUsers.keys());
    return await db.collection("users").find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }).toArray();
  },

  async getUser(db, userId) {
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) throw new Error("User not found");
    return user;
  },

  async getUsersFromId(db, userIds) {
    return await db.collection("users").find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }).toArray();
  },

  async setLabels(db, userId, labels) {
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { labels } }
    );
    return { message: "Labels updated" };
  },

  async getLabels(db, userId) {
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) throw new Error("User not found");
    return user.labels || [];
  },

  async deleteLabels(db, userId) {
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { labels: [] } }
    );
    return { message: "Labels deleted" };
  },

  async setPreference(db, userId, key, value) {
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { preferences: { [key]: value } } }
    );
    return { message: "Preference set" };
  },

  async updatePreference(db, userId, key, value) {
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { [`preferences.${key}`]: value } }
    );
    return { message: "Preference updated" };
  },

  async deletePreferenceKey(db, userId, key) {
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $unset: { [`preferences.${key}`]: "" } }
    );
    return { message: "Preference key deleted" };
  },

  async getPreferences(db, userId) {
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) throw new Error("User not found");
    return user.preferences || {};
  },

  async deleteUser(db, userId) {
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(userId) });
    if (result.deletedCount === 0) throw new Error("User not found");
    await db.collection("sessions").deleteMany({ userId: new ObjectId(userId) });
    return { message: "User deleted" };
  },

  async createUser(db, payload) {
    const { name, email, password, isSuper } = payload;
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) throw new Error("User already exists");

    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      isSuper,
      createdAt: new Date(),
      labels: [],
      preferences: {},
    });
    return { userId: result.insertedId.toString() };
  },
};