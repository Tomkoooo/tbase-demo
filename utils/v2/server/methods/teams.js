// server/socket/teams.js
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../dist/config.js";

export function setupTeamHandlers(io, clientDatabases) {
  return (socket) => {
    socket.on("teams:action", async (data) => {
      const { action, teamId, name, styling, creatorId, userId, role, addedBy, removedBy, updatedBy, labels, requiredPermission, expression, token } = data;
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
        const isSuperUser = (await db.getUser(decoded.userId))?.isSuper || false;

        switch (action) {
          case "create":
            const newTeam = await db.createTeam({ name, styling, creatorId });
            await db.addTeamUser(newTeam.id, creatorId, "admin", creatorId);
            socket.emit("team:created", newTeam);
            break;
          case "get":
            const team = await db.getTeam(teamId);
            socket.emit("team:result", team);
            break;
          case "getAll":
            const teams = await db.getTeams(userId);
            socket.emit("team:list", teams.teams);
            break;
          case "update":
            if (!isSuperUser && !["admin", "moderator"].includes(await db.getTeamUserRole(teamId, userId))) {
              socket.emit("error", { message: "Only admin, moderator, or super user can update team" });
              return;
            }
            const updatedTeam = await db.updateTeam(teamId, name, styling, userId);
            socket.emit("team:updated", updatedTeam);
            break;
          case "delete":
            if (!isSuperUser && !["admin"].includes(await db.getTeamUserRole(teamId, userId))) {
              socket.emit("error", { message: "Only admin or super user can delete team" });
              return;
            }
            const deletedTeam = await db.deleteTeam(teamId, userId);
            socket.emit("team:deleted", deletedTeam);
            break;
          case "addUser":
            if (!isSuperUser && !["admin", "moderator"].includes(await db.getTeamUserRole(teamId, addedBy))) {
              socket.emit("error", { message: "Only admin, moderator, or super user can add users" });
              return;
            }
            const addedUser = await db.addTeamUser(teamId, userId, role, addedBy);
            socket.emit("team:userAdded", addedUser);
            break;
          case "removeUser":
            if (!isSuperUser && !["admin", "moderator"].includes(await db.getTeamUserRole(teamId, removedBy))) {
              socket.emit("error", { message: "Only admin, moderator, or super user can remove users" });
              return;
            }
            const removedUser = await db.removeTeamUser(teamId, userId, removedBy);
            socket.emit("team:userRemoved", removedUser);
            break;
          case "updateUserRole":
            if (!isSuperUser && !["admin", "moderator"].includes(await db.getTeamUserRole(teamId, updatedBy))) {
              socket.emit("error", { message: "Only admin, moderator, or super user can update roles" });
              return;
            }
            const updatedRole = await db.updateTeamUserRole(teamId, userId, role, updatedBy);
            socket.emit("team:userRoleUpdated", updatedRole);
            break;
          case "updateUserLabels":
            if (!isSuperUser && !["admin", "moderator"].includes(await db.getTeamUserRole(teamId, updatedBy)) && userId !== updatedBy) {
              socket.emit("error", { message: "Only admin, moderator, super user, or self can update labels" });
              return;
            }
            const updatedLabels = await db.updateTeamUserLabels(teamId, userId, labels, updatedBy);
            socket.emit("team:userLabelsUpdated", updatedLabels);
            break;
          case "leave":
            const leftTeam = await db.removeTeamUser(teamId, userId, userId);
            socket.emit("team:userLeft", leftTeam);
            break;
          case "listAll":
            if (!isSuperUser) {
              socket.emit("error", { message: "Only super user can list all teams" });
              return;
            }
            const allTeams = await db.listTeams();
            socket.emit("team:list", allTeams);
            break;
          case "checkPermission":
            const hasPermission = await db.checkTeamPermission(teamId, userId, requiredPermission);
            socket.emit("team:permissionCheck", { hasPermission });
            break;
          case "evaluatePermission":
            const result = await db.evaluateTeamPermission(teamId, userId, expression);
            socket.emit("team:permissionEvaluate", { result });
            break;
          default:
            socket.emit("error", { message: "Invalid team action" });
        }
      } catch (err) {
        socket.emit("error", { message: err.message || "Team action failed" });
      }
    });
  };
}