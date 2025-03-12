"use client";

import React, { useState, useEffect } from "react";
import { mongoClient } from "@/utils/bundlers";

const Page = () => {
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" }>({ message: "", type: "info" });
  const [permissions, setPermissions] = useState<any[]>([]);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);

  // Permission State
  const [permissionId, setPermissionId] = useState<string | null>(null);
  const [itemId, setItemId] = useState("");
  const [requireAction, setRequireAction] = useState("");
  const [requireRole, setRequireRole] = useState("");

  // User Permission State
  const [userPermissionId, setUserPermissionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [onDoc, setOnDoc] = useState("");
  const [permissionType, setPermission] = useState("");
  const [checkResult, setCheckResult] = useState<boolean | null>(null);

  // Demo State
  const [demoDocId, setDemoDocId] = useState<string>("");
  const [demoUserId, setDemoUserId] = useState<string | null>(null);
  const [demoPermission, setDemoPermission] = useState("");
  const [currentUser, setCurrentUser] = useState({
    id: "507f1f77bcf86cd799439011", // Example MongoDB ObjectId
    email: "currentuser@example.com",
    name: "Current User",
    permissions: [
      { onDoc: "doc-1", permission: "read" },
      { onDoc: "doc-2", permission: "write" },
    ],
  });

  // Permission Handlers
  const handleCreatePermission = async () => {
    if (!itemId || !requireAction) {
      setStatus({ message: "Please fill in Item ID and Require Action", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.createPermission(itemId, requireAction, requireRole || null);
      setStatus({ message: `Created Permission: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleGetPermission = async () => {
    if (!permissionId) {
      setStatus({ message: "Please enter a Permission ID to fetch", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.getPermission(permissionId);
      setStatus({ message: `Fetched Permission: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleGetPermissions = async () => {
    try {
      const result = await mongoClient.getPermissions(itemId || null);
      setPermissions(result);
      setStatus({ message: `Fetched ${result.length} Permissions`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleUpdatePermission = async () => {
    if (!permissionId || !itemId || !requireAction) {
      setStatus({ message: "Please fill in Permission ID, Item ID, and Require Action to update", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.updatePermission(permissionId, itemId, requireAction, requireRole || null);
      setStatus({ message: `Updated Permission: ${JSON.stringify(result)}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleDeletePermission = async () => {
    if (!permissionId) {
      setStatus({ message: "Please enter a Permission ID to delete", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.deletePermission(permissionId);
      setStatus({ message: `Deleted Permission: ${JSON.stringify(result)}`, type: "success" });
      setPermissions(permissions.filter((p) => p.id !== permissionId));
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  // User Permission Handlers
  const handleCreateUserPermission = async () => {
    if (!userId || !onDoc || !permissionType) {
      setStatus({ message: "Please fill in User ID, Document/Route, and Permission", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.createUserPermission(userId, onDoc, permissionType);
      setStatus({ message: `Created User Permission: ${JSON.stringify(result)}`, type: "success" });
      updateCurrentUserPermissions(userId, onDoc, permissionType, true);
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleGetUserPermissions = async () => {
    if (!userId) {
      setStatus({ message: "Please enter a User ID to fetch permissions", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.getUserPermissions(userId, onDoc || null);
      setUserPermissions(result);
      setStatus({ message: `Fetched ${result.length} User Permissions for User ID ${userId}`, type: "success" });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleUpdateUserPermission = async () => {
    if (!userPermissionId || !onDoc || !permissionType) {
      setStatus({ message: "Please fill in User Permission ID, Document/Route, and Permission to update", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.updateUserPermission(userPermissionId, onDoc, permissionType);
      setStatus({ message: `Updated User Permission: ${JSON.stringify(result)}`, type: "success" });
      if (userId === currentUser.id) {
        updateCurrentUserPermissions(userId, onDoc, permissionType, true);
      }
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleDeleteUserPermission = async () => {
    if (!userPermissionId) {
      setStatus({ message: "Please enter a User Permission ID to delete", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.deleteUserPermission(userPermissionId);
      setStatus({ message: `Deleted User Permission: ${JSON.stringify(result)}`, type: "success" });
      setUserPermissions(userPermissions.filter((p) => p.id !== userPermissionId));
      if (userId === currentUser.id) {
        updateCurrentUserPermissions(userId, onDoc, permissionType, false);
      }
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  const handleCheckUserPermission = async () => {
    if (!userId || !onDoc || !permissionType) {
      setStatus({ message: "Please fill in User ID, Document/Route, and Permission to check", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.checkUserPermission(userId, onDoc, permissionType);
      setCheckResult(result.hasPermission);
      setStatus({
        message: `Permission Check for User ${userId} on ${onDoc}: ${result.hasPermission ? "Granted" : "Denied"}`,
        type: result.hasPermission ? "success" : "error",
      });
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  // Demo Handler
  const handleCreateDemoDoc = async () => {
    const newDocId = `doc-${Date.now()}`;
    setDemoDocId(newDocId);
    setStatus({ message: `Created Demo Document with ID: ${newDocId}`, type: "success" });
  };

  const handleSetUserPermission = async () => {
    if (!demoUserId || !demoDocId || !demoPermission) {
      setStatus({ message: "Please fill in User ID and Permission for the demo document", type: "error" });
      return;
    }
    try {
      const result = await mongoClient.createUserPermission(demoUserId, demoDocId, demoPermission);
      setStatus({
        message: `Set Permission for User ${demoUserId} on ${demoDocId}: ${demoPermission}`,
        type: "success",
      });
      if (demoUserId === currentUser.id) {
        updateCurrentUserPermissions(demoUserId, demoDocId, demoPermission, true);
      }
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: "error" });
    }
  };

  // Helper to update currentUser state
  const updateCurrentUserPermissions = (userId: string, onDoc: string, perm: string, add: boolean) => {
    if (userId === currentUser.id) {
      setCurrentUser((prev) => {
        const permissions = add
          ? [...prev.permissions, { onDoc, permission: perm }]
          : prev.permissions.filter((p) => p.onDoc !== onDoc || p.permission !== perm);
        return { ...prev, permissions };
      });
      setStatus({
        message: `Updated Current User permissions: ${add ? "Added" : "Removed"} ${perm} for ${onDoc}`,
        type: "success",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-4xl font-extrabold text-center text-indigo-600 mb-4">Permission Tester</h1>
        <p className="text-center text-gray-600 mb-6">Test permissions and user permissions with real-time feedback!</p>

        {/* Status Feedback */}
        {status.message && (
          <div
            className={`mb-6 p-3 rounded-lg text-center text-white ${
              status.type === "success"
                ? "bg-green-500"
                : status.type === "error"
                ? "bg-red-500"
                : "bg-blue-500"
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Permission Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">General Permissions</h2>
          <p className="text-gray-600 mb-4">
            Manage document or route-level permissions (e.g., who can edit a document).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Permission ID (Hex)</label>
              <input
                type="text"
                value={permissionId || ""}
                onChange={(e) => setPermissionId(e.target.value)}
                placeholder="e.g., 507f1f77bcf86cd799439011"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Item ID (Required)</label>
              <input
                type="text"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                placeholder="e.g., doc-3"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Require Action (Required)</label>
              <input
                type="text"
                value={requireAction}
                onChange={(e) => setRequireAction(e.target.value)}
                placeholder="e.g., edit"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Require Role (Optional)</label>
              <input
                type="text"
                value={requireRole}
                onChange={(e) => setRequireRole(e.target.value)}
                placeholder="e.g., admin"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={handleCreatePermission}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-600 transition duration-200"
              title="Create a new permission rule for an item"
            >
              Create New Permission
            </button>
            <button
              onClick={handleGetPermission}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-200"
              disabled={!permissionId}
              title="Fetch a specific permission by ID"
            >
              Fetch Permission by ID
            </button>
            <button
              onClick={handleGetPermissions}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition duration-200"
              title="Fetch all permissions, optionally filtered by Item ID"
            >
              Fetch All Permissions
            </button>
            <button
              onClick={handleUpdatePermission}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-yellow-600 transition duration-200"
              disabled={!permissionId}
              title="Update an existing permission by ID"
            >
              Update Permission
            </button>
            <button
              onClick={handleDeletePermission}
              className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-200"
              disabled={!permissionId}
              title="Delete a permission by ID"
            >
              Delete Permission
            </button>
          </div>
          {permissions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-indigo-600 mb-2">Permissions List</h3>
              <ul className="space-y-2">
                {permissions.map((perm, idx) => (
                  <li key={idx} className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700">
                    ID: {perm.id}, Item: {perm.item_id}, Action: {perm.require_action}, Role: {perm.require_role || "N/A"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* User Permission Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">User Permissions</h2>
          <p className="text-gray-600 mb-4">
            Manage individual user permissions for specific documents or routes.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">User Permission ID (Hex)</label>
              <input
                type="text"
                value={userPermissionId || ""}
                onChange={(e) => setUserPermissionId(e.target.value)}
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
              <label className="block text-gray-700 font-medium mb-1">Document/Route (Required)</label>
              <input
                type="text"
                value={onDoc}
                onChange={(e) => setOnDoc(e.target.value)}
                placeholder="e.g., doc-3"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Permission (Required)</label>
              <input
                type="text"
                value={permissionType}
                onChange={(e) => setPermission(e.target.value)}
                placeholder="e.g., read/write"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={handleCreateUserPermission}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-600 transition duration-200"
              disabled={!userId || !onDoc || !permissionType}
              title="Add a new permission for a user"
            >
              Add User Permission
            </button>
            <button
              onClick={handleGetUserPermissions}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition duration-200"
              disabled={!userId}
              title="Fetch all permissions for a user, optionally filtered by Document/Route"
            >
              Fetch User Permissions
            </button>
            <button
              onClick={handleUpdateUserPermission}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-yellow-600 transition duration-200"
              disabled={!userPermissionId}
              title="Update an existing user permission by ID"
            >
              Update User Permission
            </button>
            <button
              onClick={handleDeleteUserPermission}
              className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-200"
              disabled={!userPermissionId}
              title="Delete a user permission by ID"
            >
              Delete User Permission
            </button>
            <button
              onClick={handleCheckUserPermission}
              className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600 transition duration-200"
              disabled={!userId || !onDoc || !permissionType}
              title="Check if a user has a specific permission for a document/route"
            >
              Check User Permission
            </button>
          </div>
          {userPermissions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-indigo-600 mb-2">User Permissions List</h3>
              <ul className="space-y-2">
                {userPermissions.map((perm, idx) => (
                  <li key={idx} className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700">
                    ID: {perm.id}, User: {perm.user_id}, Doc/Route: {perm.onDoc}, Permission: {perm.permission}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {checkResult !== null && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
              <p className={checkResult ? "text-green-600" : "text-red-600"}>
                Permission Check: {checkResult ? "Granted" : "Denied"}
              </p>
            </div>
          )}
        </section>

        {/* Demo Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Real-Life Demo</h2>
          <p className="text-gray-600 mb-4">
            Create a document and assign permissions to users. Test with the Current User (ID: {currentUser.id}).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Demo Document ID</label>
              <input
                type="text"
                value={demoDocId}
                readOnly
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2"
                placeholder="Click 'Create Document' to generate"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreateDemoDoc}
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition duration-200"
              >
                Create New Document
              </button>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">User ID (Hex, Required)</label>
              <input
                type="text"
                value={demoUserId || ""}
                onChange={(e) => setDemoUserId(e.target.value)}
                placeholder="e.g., 507f1f77bcf86cd799439011"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Permission (Required)</label>
              <input
                type="text"
                value={demoPermission}
                onChange={(e) => setDemoPermission(e.target.value)}
                placeholder="e.g., read/write"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSetUserPermission}
              className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600 transition duration-200"
              disabled={!demoUserId || !demoDocId || !demoPermission}
              title="Assign a permission to the user for the demo document"
            >
              Assign Permission to User
            </button>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">Current User Permissions</h3>
            {currentUser.permissions.length > 0 ? (
              <ul className="space-y-2">
                {currentUser.permissions.map((perm, idx) => (
                  <li key={idx} className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700">
                    Doc/Route: {perm.onDoc}, Permission: {perm.permission}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No permissions assigned to the Current User yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Page;