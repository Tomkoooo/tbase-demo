// socket/utils.js
export function handleError(socket, error) {
    socket.emit("error", { message: error.message || "An error occurred" });
  }
  
  export function getDatabase(clientDatabases, socketId) {
    const db = clientDatabases.get(socketId);
    if (!db) throw new Error("Database not initialized");
    return db;
  }