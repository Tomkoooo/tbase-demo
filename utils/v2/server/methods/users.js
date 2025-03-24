// socket/users.js
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../dist/config.js";
import { getDatabase, handleError } from "../utils.js";

export function setupUsersHandlers(io, clientDatabases, onlineUsers) {
  return (socket) => {
    socket.on("users:action", async ({ action, data }) => {
      let db;
      try {
        db = getDatabase(clientDatabases, socket.id);
      } catch (err) {
        handleError(socket, err);
        return;
      }

      try {
        switch (action) {
          case "listAll":
            const allUsers = await db.listAll();
            socket.emit("users:result", { status: "success", users: allUsers });
            break;

          case "listOnline":
            const onlineUserList = await db.listOnline(onlineUsers);
            socket.emit("users:result", { status: "success", users: onlineUserList });
            break;

          case "listenOnlineUsers":
            socket.emit("users:onlineChanged", Array.from(onlineUsers.keys()));
            break;

          case "getUser":
            const user = await db.getUserById(data.userId);
            socket.emit("users:result", { status: "success", user });
            break;

          case "getUsersFromId":
            const usersFromId = await db.getUsersFromId(data.userIds);
            socket.emit("users:result", { status: "success", users: usersFromId });
            break;

          case "setLabels":
            const setLabelsResult = await db.setUserLabels(data.userId, data.labels);
            socket.emit("users:result", { status: "success", ...setLabelsResult });
            break;

          case "getLabels":
            const labels = await db.getUserLabels(data.userId);
            socket.emit("users:result", { status: "success", labels });
            break;

          case "deleteLabels":
            const deleteLabelsResult = await db.deleteUserLabels(data.userId);
            socket.emit("users:result", { status: "success", ...deleteLabelsResult });
            break;

          case "setPreference":
            const setPrefResult = await db.setUserPreference(data.userId, data.key, data.value);
            socket.emit("users:result", { status: "success", ...setPrefResult });
            break;

          case "updatePreference":
            const updatePrefResult = await db.updateUserPreference(data.userId, data.key, data.value);
            socket.emit("users:result", { status: "success", ...updatePrefResult });
            break;

          case "deletePreferenceKey":
            const deletePrefResult = await db.deleteUserPreferenceKey(data.userId, data.key);
            socket.emit("users:result", { status: "success", ...deletePrefResult });
            break;

          case "getPreferences":
            const preferences = await db.getUserPreferences(data.userId);
            socket.emit("users:result", { status: "success", preferences });
            break;

          case "deleteUser":
            const requestingUser = await db.getUser(jwt.verify(socket.handshake.auth.token, SECRET_KEY).userId);
            if (!requestingUser.isSuper) throw new Error("Unauthorized: Superuser access required");
            const deleteUserResult = await db.deleteUser(data.userId);
            onlineUsers.delete(data.userId);
            io.emit("users:onlineChanged", Array.from(onlineUsers.keys()));
            socket.emit("users:result", { status: "success", ...deleteUserResult });
            break;

          case "createUser":
            const creatorUser = await db.getUser(jwt.verify(socket.handshake.auth.token, SECRET_KEY).userId);
            if (!creatorUser.isSuper) throw new Error("Unauthorized: Superuser access required");
            const createUserResult = await db.createUser(data);
            socket.emit("users:result", { status: "success", ...createUserResult });
            break;

          default:
            socket.emit("users:result", { status: "error", message: "Unknown action" });
        }
      } catch (err) {
        handleError(socket, err);
      }
    });
  };
}

// Online users frissítése az account scope-ban
export function updateOnlineUsers(io, onlineUsers, socket, db, action, data) {
  return async () => {
    try {
      if (action === "getSession" || action === "getAccount") {
        const decoded = jwt.verify(data.token, SECRET_KEY);
        onlineUsers.set(decoded.userId, socket.id);
        io.emit("users:onlineChanged", Array.from(onlineUsers.keys()));
      } else if (action === "killSession" || action === "killSessions") {
        const decoded = jwt.verify(data.token, SECRET_KEY);
        if (!data.sessionId || action === "killSessions") {
          onlineUsers.delete(decoded.userId);
          io.emit("users:onlineChanged", Array.from(onlineUsers.keys()));
        }
      }
    } catch (err) {
      handleError(socket, err);
    }
  };
}