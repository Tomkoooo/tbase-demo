// socket/account.js
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../dist/config.js";
import { getDatabase, handleError } from "../utils.js";
import { updateOnlineUsers } from "./users.js"; // Import hozzáadása

export function setupAccountHandlers(io, clientDatabases, onlineUsers) {
  return (socket) => {
    socket.on("account:action", async ({ action, data }) => {
      let db;
      try {
        db = getDatabase(clientDatabases, socket.id);
      } catch (err) {
        handleError(socket, err);
        return;
      }

      try {
        switch (action) {
          case "signup":
            const userId = await db.signUp(data);
            const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: "1h" });
            socket.emit("account:result", { status: "success", token, userId });
            break;

          case "signin":
            const { user: signInUser, sessionId } = await db.signIn(data.user, data.password, data.isSuper);
            const signInToken = jwt.sign({ userId: signInUser._id }, SECRET_KEY, { expiresIn: "1h" });
            socket.emit("account:result", { status: "success", token: signInToken, sessionId, user: signInUser });
            break;

          case "validate":
            const validatedUser = await db.getUser(jwt.verify(data.token, SECRET_KEY).userId);
            socket.emit("account:result", { status: "success", user: validatedUser });
            break;

          case "getAccount":
            const accountUser = await db.getUser(jwt.verify(data.token, SECRET_KEY).userId);
            socket.emit("account:result", { status: "success", user: accountUser });
            await updateOnlineUsers(io, onlineUsers, socket, db, action, data)();
            break;

          case "getSession":
            const session = await db.getSession(data.token, SECRET_KEY);
            socket.emit("account:result", { status: "success", session });
            await updateOnlineUsers(io, onlineUsers, socket, db, action, data)();
            break;

          case "getSessions":
            const sessions = await db.getSessions(data.token, SECRET_KEY);
            socket.emit("account:result", { status: "success", sessions });
            break;

          case "killSession":
            const killSessionResult = await db.killSession(data.token, data.sessionId, SECRET_KEY);
            socket.emit("account:result", { status: "success", ...killSessionResult });
            await updateOnlineUsers(io, onlineUsers, socket, db, action, data)();
            break;

          case "killSessions":
            const killSessionsResult = await db.killSessions(data.token, SECRET_KEY);
            socket.emit("account:result", { status: "success", ...killSessionsResult });
            await updateOnlineUsers(io, onlineUsers, socket, db, action, data)();
            break;

          case "getLabels":
            const labels = await db.getLabels(data.token, SECRET_KEY);
            socket.emit("account:result", { status: "success", labels });
            break;

          case "setLabels":
            const setLabelsResult = await db.setLabels(data.token, data.labels, SECRET_KEY);
            socket.emit("account:result", { status: "success", ...setLabelsResult });
            break;

          case "deleteLabels":
            const deleteLabelsResult = await db.deleteLabels(data.token, SECRET_KEY);
            socket.emit("account:result", { status: "success", ...deleteLabelsResult });
            break;

          case "getPreferences":
            const preferences = await db.getPreferences(data.token, SECRET_KEY);
            socket.emit("account:result", { status: "success", preferences });
            break;

          case "setPreferences":
            const setPrefsResult = await db.setPreferences(data.token, data.preferences, SECRET_KEY);
            socket.emit("account:result", { status: "success", ...setPrefsResult });
            break;

          case "updatePreferences":
            const updatePrefsResult = await db.updatePreferences(data.token, data.key, data.value, SECRET_KEY);
            socket.emit("account:result", { status: "success", ...updatePrefsResult });
            break;

          case "deletePreferences":
            const deletePrefsResult = await db.deletePreferences(data.token, data.key, SECRET_KEY);
            socket.emit("account:result", { status: "success", ...deletePrefsResult });
            break;

          default:
            socket.emit("account:result", { status: "error", message: "Unknown action" });
        }
      } catch (err) {
        handleError(socket, err);
      }
    });
  };
}