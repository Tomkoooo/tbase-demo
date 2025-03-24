// database/methods/account.js
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export const accountMethods = {
  async signUp(db, payload) {
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
    return result.insertedId.toString();
  },

  async signIn(db, user, password, isSuper) {
    const userDoc = await db.collection("users").findOne({ $or: [{ email: user }, { name: user }] });
    if (!userDoc || !bcrypt.compareSync(password, userDoc.password) || userDoc.isSuper !== isSuper) {
      throw new Error("Invalid credentials");
    }
    // Session létrehozása
    const session = {
      userId: userDoc._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 óra lejárat
    };
    const sessionResult = await db.collection("sessions").insertOne(session);
    return { user: userDoc, sessionId: sessionResult.insertedId.toString() };
  },

  async getUser(db, userId) {
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) throw new Error("User not found");
    return user;
  },

  async getSession(db, token, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    const session = await db.collection("sessions").findOne({
      userId: new ObjectId(decoded.userId),
      expiresAt: { $gt: new Date() },
    });
    if (!session) throw new Error("Session not found or expired");
    return { sessionId: session._id.toString() };
  },

  async getSessions(db, token, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    const sessions = await db.collection("sessions").find({
      userId: new ObjectId(decoded.userId),
    }).toArray();
    return sessions.map((s) => ({
      sessionId: s._id.toString(),
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  },

  async killSession(db, token, sessionId, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    if (sessionId) {
      await db.collection("sessions").deleteOne({ _id: new ObjectId(sessionId) });
    } else {
      await db.collection("sessions").deleteOne({
        userId: new ObjectId(decoded.userId),
        expiresAt: { $gt: new Date() },
      });
    }
    return { message: "Session terminated" };
  },

  async killSessions(db, token, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    await db.collection("sessions").deleteMany({ userId: new ObjectId(decoded.userId) });
    return { message: "All sessions terminated" };
  },

  async getLabels(db, token, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) throw new Error("User not found");
    return user.labels;
  },

  async setLabels(db, token, labels, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { labels } }
    );
    return { message: "Labels updated" };
  },

  async deleteLabels(db, token, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { labels: [] } }
    );
    return { message: "Labels deleted" };
  },

  async getPreferences(db, token, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) throw new Error("User not found");
    return user.preferences;
  },

  async setPreferences(db, token, preferences, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { preferences } }
    );
    return { message: "Preferences updated" };
  },

  async updatePreferences(db, token, key, value, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { [`preferences.${key}`]: value } }
    );
    return { message: "Preference updated" };
  },

  async deletePreferences(db, token, key, jwtSecret) {
    const decoded = jwt.verify(token, jwtSecret);
    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $unset: { [`preferences.${key}`]: "" } }
    );
    return { message: "Preference deleted" };
  },
};