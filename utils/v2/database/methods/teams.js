// server/database/methods/teams.js
import { ObjectId } from "mongodb";

export const teamMethods = {
  async createTeam(db, { name, styling, creatorId }) {
    const result = await db.collection("teams").insertOne({
      name,
      styling,
      creator_id: creatorId,
      labels: [],
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { id: result.insertedId.toString(), name, styling, creator_id: creatorId, labels: [] };
  },

  async getTeam(db, teamId) {
    const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
    if (!team) return null;

    const teamMembers = await db.collection("team_users").find({ team_id: teamId }).toArray();
    return {
      id: team._id.toString(),
      name: team.name,
      styling: team.styling || "{}",
      creator_id: team.creator_id || "",
      labels: team.labels || [],
      users: teamMembers.map(member => ({
        user_id: member.user_id,
        role: member.role,
        labels: member.labels || [],
      })),
    };
  },

  async getTeams(db, userId) {
    const teamIds = await db.collection("team_users").distinct("team_id", { user_id: userId });
    if (!teamIds.length) return { teams: [] };

    const teams = await db.collection("teams").find({ _id: { $in: teamIds.map(id => new ObjectId(id)) } }).toArray();
    const teamMembers = await db.collection("team_users").find({ team_id: { $in: teamIds } }).toArray();

    const teamsMap = {};
    teams.forEach(team => {
      teamsMap[team._id.toString()] = {
        id: team._id.toString(),
        name: team.name || "",
        styling: team.styling || "{}",
        creator_id: team.creator_id || "",
        labels: team.labels || [],
        users: [],
      };
    });

    teamMembers.forEach(member => {
      const teamId = member.team_id.toString();
      if (teamsMap[teamId]) {
        teamsMap[teamId].users.push({
          user_id: member.user_id || "",
          role: member.role || "",
          labels: member.labels || [],
        });
      }
    });

    return { teams: Object.values(teamsMap) };
  },

  async updateTeam(db, teamId, name, styling, userId) {
    const result = await db.collection("teams").findOneAndUpdate(
      { _id: new ObjectId(teamId) },
      { $set: { name, styling, updated_at: new Date() } },
      { returnDocument: "after" }
    );
    return { id: teamId, name, styling, creator_id: result.value.creator_id };
  },

  async deleteTeam(db, teamId, userId) {
    await db.collection("team_users").deleteMany({ team_id: teamId });
    await db.collection("teams").deleteOne({ _id: new ObjectId(teamId) });
    return { id: teamId };
  },

  async addTeamUser(db, teamId, userId, role, addedBy) {
    const result = await db.collection("team_users").insertOne({
      team_id: teamId,
      user_id: userId,
      role,
      labels: [],
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { id: result.insertedId.toString(), team_id: teamId, user_id: userId, role };
  },

  async removeTeamUser(db, teamId, userId, removedBy) {
    await db.collection("team_users").deleteOne({ team_id: teamId, user_id: userId });
    return { team_id: teamId, user_id: userId };
  },

  async updateTeamUserRole(db, teamId, userId, role, updatedBy) {
    const result = await db.collection("team_users").findOneAndUpdate(
      { team_id: teamId, user_id: userId },
      { $set: { role, updated_at: new Date() } },
      { returnDocument: "after" }
    );
    return { team_id: teamId, user_id: userId, role };
  },

  async updateTeamUserLabels(db, teamId, userId, labels, updatedBy) {
    const result = await db.collection("team_users").findOneAndUpdate(
      { team_id: teamId, user_id: userId },
      { $set: { labels, updated_at: new Date() } },
      { returnDocument: "after" }
    );
    return { team_id: teamId, user_id: userId, labels };
  },

  async getTeamUserRole(db, teamId, userId) {
    const result = await db.collection("team_users").findOne(
      { team_id: teamId, user_id: userId },
      { projection: { role: 1 } }
    );
    return result?.role || null;
  },

  async listTeams(db) {
    const teams = await db.collection("teams").find().toArray();
    const teamMembers = await db.collection("team_users").find().toArray();

    const teamsMap = {};
    teams.forEach(team => {
      teamsMap[team._id.toString()] = {
        id: team._id.toString(),
        name: team.name || "",
        styling: team.styling || "{}",
        creator_id: team.creator_id || "",
        labels: team.labels || [],
        users: [],
      };
    });

    teamMembers.forEach(member => {
      const teamId = member.team_id.toString();
      if (teamsMap[teamId]) {
        teamsMap[teamId].users.push({
          user_id: member.user_id || "",
          role: member.role || "",
          labels: member.labels || [],
        });
      }
    });

    return Object.values(teamsMap);
  },

  async checkTeamPermission(db, teamId, userId, requiredPermission) {
    const teamUser = await db.collection("team_users").findOne({ team_id: teamId, user_id: userId });
    if (!teamUser) return false;

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    return teamUser.role === requiredPermission || user?.isSuper || false;
  },

  async evaluateTeamPermission(db, teamId, userId, expression) {
    const teamUser = await db.collection("team_users").findOne({ team_id: teamId, user_id: userId });
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    const isSuper = user?.isSuper || false;

    const context = {
      member: !!teamUser,
      admin: teamUser?.role === "admin" || isSuper,
      moderator: teamUser?.role === "moderator" || isSuper,
      editor: teamUser?.role === "editor" || isSuper,
      viewer: teamUser?.role === "viewer" || isSuper,
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