"use client";

import React, { useState, useEffect } from "react";
import {mongoClient} from "@/utils/bundlers";

const TeamsPage = () => {
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" }>({ message: "", type: "info" });
  const [teams, setTeams] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);

  // Team State
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamStyling, setTeamStyling] = useState('{"color": "#000000", "icon": ""}');
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // Team User State
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState("507f1f77bcf86cd799439011"); // Példa current user

  // Team Handlers
  const handleCreateTeam = async () => {
    if (!teamName || !creatorId) {
      setStatus({ message: "Team name and creator ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.createTeam(teamName, teamStyling, creatorId);
      setStatus({ message: `Created Team: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleGetTeam = async () => {
    if (!teamId) {
      setStatus({ message: "Please enter a Team ID", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.getTeam(teamId);
      setTeams([result]);
      setStatus({ message: `Fetched Team: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleGetTeams = async () => {
    try {
      const result = await mongoClient.getTeams(currentUserId);
      setTeams(result);
      setStatus({ message: `Fetched ${result.length} Teams`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleUpdateTeam = async () => {
    if (!teamId || !currentUserId) {
      setStatus({ message: "Team ID and current user ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.updateTeam(teamId, teamName, teamStyling, currentUserId);
      setStatus({ message: `Updated Team: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId || !currentUserId) {
      setStatus({ message: "Team ID and current user ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.deleteTeam(teamId, currentUserId);
      setStatus({ message: `Deleted Team: ${JSON.stringify(result)}`, type: "success" });
      setTeams(teams.filter((t) => t.id !== teamId));
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  // Team User Handlers
  const handleAddTeamUser = async () => {
    if (!teamId || !userId || !currentUserId) {
      setStatus({ message: "Team ID, user ID, and current user ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.addTeamUser(teamId, userId, role, currentUserId);
      setStatus({ message: `Added User to Team: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleRemoveTeamUser = async () => {
    if (!teamId || !userId || !currentUserId) {
      setStatus({ message: "Team ID, user ID, and current user ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.removeTeamUser(teamId, userId, currentUserId);
      setStatus({ message: `Removed User from Team: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleUpdateTeamUserRole = async () => {
    if (!teamId || !userId || !currentUserId) {
      setStatus({ message: "Team ID, user ID, and current user ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.updateTeamUserRole(teamId, userId, role, currentUserId);
      setStatus({ message: `Updated User Role: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleUpdateTeamUserLabels = async () => {
    if (!teamId || !userId || !currentUserId) {
      setStatus({ message: "Team ID, user ID, and current user ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.updateTeamUserLabels(teamId, userId, labels, currentUserId);
      setStatus({ message: `Updated User Labels: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleLeaveTeam = async () => {
    if (!teamId || !currentUserId) {
      setStatus({ message: "Team ID and current user ID are required", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.leaveTeam(teamId, currentUserId);
      setStatus({ message: `Left Team: ${JSON.stringify(result)}`, type: "success" });
      setTeams(teams.filter((t) => t.id !== teamId));
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-4xl font-extrabold text-center text-indigo-600 mb-4">Team Manager</h1>
        <p className="text-center text-gray-600 mb-6">Manage teams and their members with real-time feedback!</p>

        {/* Status Feedback */}
        {status.message && (
          <div
            className={`mb-6 p-3 rounded-lg text-center text-white ${
              status.type === "success" ? "bg-green-500" : status.type === "error" ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Team Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Team Management</h2>
          <p className="text-gray-600 mb-4">Create, update, or delete teams (admin/moderator only).</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Team ID (Hex)</label>
              <input
                type="text"
                value={teamId || ""}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="e.g., 507f1f77bcf86cd799439011"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Team Name (Required)</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., DevTeam"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Team Styling (JSON)</label>
              <input
                type="text"
                value={teamStyling}
                onChange={(e) => setTeamStyling(e.target.value)}
                placeholder='e.g., {"color": "#000000", "icon": ""}'
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Creator ID (Hex, Required)</label>
              <input
                type="text"
                value={creatorId || ""}
                onChange={(e) => setCreatorId(e.target.value)}
                placeholder="e.g., 507f1f77bcf86cd799439011"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Current user id</label>
              <input
                type="text"
                value={currentUserId || ""}
                onChange={(e) => setCurrentUserId(e.target.value)}
                placeholder="e.g., 507f1f77bcf86cd799439011"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={handleCreateTeam}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-600 transition duration-200"
              disabled={!teamName || !creatorId}
              title="Create a new team (anyone can create)"
            >
              Create Team
            </button>
            <button
              onClick={handleGetTeam}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-200"
              disabled={!teamId}
              title="Fetch a specific team by ID"
            >
              Fetch Team by ID
            </button>
            <button
              onClick={handleGetTeams}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition duration-200"
              title="Fetch all teams for the current user"
            >
              Fetch My Teams
            </button>
            <button
              onClick={handleUpdateTeam}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-yellow-600 transition duration-200"
              disabled={!teamId}
              title="Update team name or styling (admin/moderator only)"
            >
              Update Team
            </button>
            <button
              onClick={handleDeleteTeam}
              className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-200"
              disabled={!teamId}
              title="Delete team (admin only)"
            >
              Delete Team
            </button>
          </div>
          {teams.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-indigo-600 mb-2">My Teams</h3>
              <ul className="space-y-2">
              {teams.map((team, idx) => (
                            <li key={idx} className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700">
                                Team ID: {team.id}, Name: {team.name}, Styling: {team.styling}
                                <ul>
                                    {team.users.map((member: any) => (
                                        <li key={member.user_id}>
                                            User ID: {member.user_id}, Role: {member.role}, Labels: {JSON.stringify(member.labels)}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
              </ul>
            </div>
          )}
        </section>

        {/* Team Users Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Team Members Management</h2>
          <p className="text-gray-600 mb-4">Add, remove, or manage team members (admin/moderator only).</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Team ID (Hex)</label>
              <input
                type="text"
                value={teamId || ""}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="e.g., 507f1f77bcf86cd799439011"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">User ID (Hex, Required)</label>
              <input
                type="text"
                value={userId || ""}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., 507f1f77bcf86cd799439011"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Role (Required for Add/Update)</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., member/admin/moderator"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Labels (JSON Array)</label>
              <input
                type="text"
                value={JSON.stringify(labels)}
                onChange={(e) => setLabels(JSON.parse(e.target.value || "[]"))}
                placeholder='e.g., ["tag1", "tag2"]'
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={handleAddTeamUser}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-600 transition duration-200"
              disabled={!teamId || !userId || !role}
              title="Add a user to the team (admin/moderator only)"
            >
              Add Team Member
            </button>
            <button
              onClick={handleRemoveTeamUser}
              className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-200"
              disabled={!teamId || !userId}
              title="Remove a user from the team (admin/moderator only)"
            >
              Remove Team Member
            </button>
            <button
              onClick={handleUpdateTeamUserRole}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-yellow-600 transition duration-200"
              disabled={!teamId || !userId || !role}
              title="Update a user's role (admin/moderator only)"
            >
              Update Member Role
            </button>
            <button
              onClick={handleUpdateTeamUserLabels}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition duration-200"
              disabled={!teamId || !userId}
              title="Update a user's labels (admin/moderator or self)"
            >
              Update Member Labels
            </button>
            <button
              onClick={handleLeaveTeam}
              className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600 transition duration-200"
              disabled={!teamId}
              title="Leave the team (self action)"
            >
              Leave Team
            </button>
          </div>
          {teamUsers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-indigo-600 mb-2">Team Members</h3>
              <ul className="space-y-2">
                {teamUsers.map((user, idx) => (
                  <li key={idx} className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700">
                    User ID: {user.user_id}, Role: {user.role}, Labels: {JSON.stringify(user.labels)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TeamsPage;