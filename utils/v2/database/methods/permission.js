// server/database/methods/permission.js
import { ObjectId } from "mongodb";

export const permissionMethods = {
  async createPermission(db, itemId, requireAction, requireRole = null) {
    const result = await db.collection("permissions").insertOne({
      item_id: itemId,
      require_action: requireAction,
      require_role: requireRole,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { id: result.insertedId.toString() };
  },

  async getPermission(db, permissionId) {
    const permission = await db.collection("permissions").findOne({ _id: new ObjectId(permissionId) });
    if (!permission) throw new Error("Permission not found");
    return { ...permission, id: permission._id.toString() };
  },

  async getPermissions(db, itemId = null) {
    const query = itemId ? { item_id: itemId } : {};
    const permissions = await db.collection("permissions").find(query).toArray();
    return permissions.map(p => ({ ...p, id: p._id.toString() }));
  },

  async updatePermission(db, permissionId, itemId, requireAction, requireRole = null) {
    const result = await db.collection("permissions").updateOne(
      { _id: new ObjectId(permissionId) },
      { $set: { item_id: itemId, require_action: requireAction, require_role: requireRole, updated_at: new Date() } }
    );
    if (result.matchedCount === 0) throw new Error("Permission not found or no changes made");
    return { success: true };
  },

  async deletePermission(db, permissionId) {
    const result = await db.collection("permissions").deleteOne({ _id: new ObjectId(permissionId) });
    if (result.deletedCount === 0) throw new Error("Permission not found");
    return { success: true };
  },

  async createUserPermission(db, userId, onDoc, permission) {
    const result = await db.collection("user_permissions").insertOne({
      user_id: userId,
      onDoc,
      permission,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { id: result.insertedId.toString() };
  },

  async getUserPermissions(db, userId, onDoc = null) {
    const query = { user_id: userId };
    if (onDoc) query.onDoc = onDoc;
    const permissions = await db.collection("user_permissions").find(query).toArray();
    return permissions.map(p => ({ ...p, id: p._id.toString() }));
  },

  async updateUserPermission(db, permissionId, onDoc, permission) {
    const result = await db.collection("user_permissions").updateOne(
      { _id: new ObjectId(permissionId) },
      { $set: { onDoc, permission, updated_at: new Date() } }
    );
    if (result.matchedCount === 0) throw new Error("User permission not found or no changes made");
    return { success: true };
  },

  async deleteUserPermission(db, permissionId) {
    const result = await db.collection("user_permissions").deleteOne({ _id: new ObjectId(permissionId) });
    if (result.deletedCount === 0) throw new Error("User permission not found");
    return { success: true };
  },

  async checkUserPermission(db, userId, onDoc, requiredPermission) {
    const permission = await db.collection("user_permissions").findOne({
      user_id: userId,
      onDoc,
      permission: requiredPermission,
    });
    if (!permission) {
      const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
      return user?.isSuper || false; // Super user mindig kap hozzáférést
    }
    return true;
  },

  async evaluateUserPermission(db, userId, onDoc, expression) {
    const permissions = await db.collection("user_permissions").find({ user_id: userId, onDoc }).toArray();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    const isSuper = user?.isSuper || false;
    const context = {
      logged_in: !!user,
      admin: permissions.some(p => p.permission === "admin") || isSuper,
      read: permissions.some(p => p.permission === "read"),
      write: permissions.some(p => p.permission === "write"),
      delete: permissions.some(p => p.permission === "delete"),
    };

    try {
      const evaluateFn = new Function(...Object.keys(context), `return ${expression}`);
      const result = evaluateFn(...Object.values(context));
      return result || isSuper; // Super user mindig kap hozzáférést
    } catch (err) {
      throw new Error(`Invalid expression: ${err.message}`);
    }
  },
};