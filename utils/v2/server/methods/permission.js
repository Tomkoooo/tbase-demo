// server/socket/permission.js
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../dist/config.js";

export function setupPermissionHandlers(io, clientDatabases) {
  return (socket) => {
    socket.on("permission:action", async (data) => {
      const { action, permissionId, itemId, requireAction, requireRole, token } = data;
      if (!token) {
        socket.emit("error", { message: "No token provided" });
        return;
      }

      const db = clientDatabases.get(socket.id);
      if (!db) {
        socket.emit("error", { message: "Database not initialized" });
        return;
      }

      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        switch (action) {
          case "create":
            const newPermission = await db.createPermission(itemId, requireAction, requireRole);
            socket.emit("permission:created", newPermission);
            break;
          case "get":
            const permission = await db.getPermission(permissionId);
            socket.emit("permission:result", permission);
            break;
          case "getAll":
            const permissions = await db.getPermissions(itemId);
            socket.emit("permission:list", permissions);
            break;
          case "update":
            const updated = await db.updatePermission(permissionId, itemId, requireAction, requireRole);
            socket.emit("permission:updated", updated);
            break;
          case "delete":
            const deleted = await db.deletePermission(permissionId);
            socket.emit("permission:deleted", deleted);
            break;
          default:
            socket.emit("error", { message: "Invalid permission action" });
        }
      } catch (err) {
        socket.emit("error", { message: err.message || "Permission action failed" });
      }
    });

    socket.on("userPermission:action", async (data) => {
      const { action, userId, onDoc, permission, permissionId, requiredPermission, expression, token } = data;
      if (!token) {
        socket.emit("error", { message: "No token provided" });
        return;
      }

      const db = clientDatabases.get(socket.id);
      if (!db) {
        socket.emit("error", { message: "Database not initialized" });
        return;
      }

      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        switch (action) {
          case "create":
            const newUserPermission = await db.createUserPermission(userId, onDoc, permission);
            socket.emit("userPermission:created", newUserPermission);
            break;
          case "getAll":
            const userPermissions = await db.getUserPermissions(userId, onDoc);
            socket.emit("userPermission:list", userPermissions);
            break;
          case "update":
            const updatedUserPermission = await db.updateUserPermission(permissionId, onDoc, permission);
            socket.emit("userPermission:updated", updatedUserPermission);
            break;
          case "delete":
            const deletedUserPermission = await db.deleteUserPermission(permissionId);
            socket.emit("userPermission:deleted", deletedUserPermission);
            break;
          case "check":
            const hasPermission = await db.checkUserPermission(userId, onDoc, requiredPermission);
            socket.emit("userPermission:check", { hasPermission });
            break;
          case "evaluate":
            const result = await db.evaluateUserPermission(userId, onDoc, expression);
            socket.emit("userPermission:evaluate", { result });
            break;
          default:
            socket.emit("error", { message: "Invalid user permission action" });
        }
      } catch (err) {
        socket.emit("error", { message: err.message || "User permission action failed" });
      }
    });
  };
}