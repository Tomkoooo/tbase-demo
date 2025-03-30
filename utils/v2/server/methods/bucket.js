// server/socket/bucket.js
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../config.js";

export function setupBucketHandlers(io, clientDatabases) {
  return (socket) => {
    socket.on("bucket:action", async (data) => {
      const { action, bucketId, newBucketId, fileId, file, token } = data;
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
            const newId = await db.createBucket();
            socket.emit("bucket:created", { bucketId: newId });
            break;
          case "delete":
            await db.deleteBucket(bucketId);
            socket.emit("bucket:deleted", { bucketId });
            break;
          case "rename":
            console.log("Renaming bucket:", bucketId, newBucketId);
            await db.renameBucket(bucketId, newBucketId);
            socket.emit("bucket:renamed", { bucketId, newBucketId });
            break;
          case "bucketList":
            const buckets = await db.listBuckets();
            socket.emit("bucket:listed", { buckets });
            break;
          case "upload":
            const newFileId = await db.uploadFile(bucketId, file);
            socket.emit("file:uploaded", { bucketId, fileId: newFileId });
            break;
          case "get":
            const retrievedFile = await db.getFile(bucketId, fileId);
            socket.emit("file:retrieved", retrievedFile);
            break;
          case "list":
            const files = await db.listFiles(bucketId);
            socket.emit("file:listed", { bucketId, files });
            break;
          case "deleteFile":
            await db.deleteFile(bucketId, fileId);
            socket.emit("file:delete", { bucketId, fileId });
            break;
          default:
            socket.emit("error", { message: "Unknown action" });
        }
      } catch (error) {
        console.error(`Bucket action error for ${socket.id}:`, error);
        socket.emit("error", { message: error.message || "Bucket action failed" });
      }
    });
  };
}