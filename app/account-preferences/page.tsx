"use client";

import { useState, useEffect } from "react";
import { mongoClient as client } from "@/utils/bundlers"; // Assuming MongoClient is defined here

export default function Home() {
  const [userId, setUserId] = useState<string>("user123"); // Default user ID
  const [logs, setLogs] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Track authentication state

  // Log helper
  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // Handle login redirect
  const handleLogin = () => {
    window.location.href = "/account-scope"; // Redirect to login/account scope
    addLog("Redirecting to /account-scope for login...");
  };

  // Check authentication status (simulated, replace with real logic if needed)
  useEffect(() => {
    const token = localStorage.getItem("t_auth");
    if (token) {
      setIsAuthenticated(true);
      addLog("User authenticated with token.");
    } else {
      setIsAuthenticated(false);
      addLog("No authentication token found. Please log in.");
    }
  }, []);

  // Labels CRUD Handlers
  const handleSetLabels = () => {
    if (!isAuthenticated) {
      addLog("Please log in to set labels.");
      return;
    }
    const labels = ["active", "developer", "admin"];
    client.users()
      .setLabels(userId, labels, (response) => {
        addLog(`Set labels response: ${JSON.stringify(response)}`);
      });
  };

  const handleGetLabels = () => {
    if (!isAuthenticated) {
      addLog("Please log in to get labels.");
      return;
    }
    client.users()
      .getLabels(userId, (response) => {
        addLog(`Get labels response: ${JSON.stringify(response)}`);
      });
  };

  const handleDeleteLabels = () => {
    if (!isAuthenticated) {
      addLog("Please log in to delete labels.");
      return;
    }
    client.users()
      .deleteLabels(userId, (response) => {
        addLog(`Delete labels response: ${JSON.stringify(response)}`);
      });
  };

  // Preferences CRUD Handlers
  const handleSetPreference = () => {
    if (!isAuthenticated) {
      addLog("Please log in to set preference.");
      return;
    }
    client.users()
      .setPreference(userId, "theme", "dark", (response) => {
        addLog(`Set preference response: ${JSON.stringify(response)}`);
      });
  };

  const handleUpdatePreference = () => {
    if (!isAuthenticated) {
      addLog("Please log in to update preference.");
      return;
    }
    client.users()
      .updatePreference(userId, "theme", "light", (response) => {
        addLog(`Update preference response: ${JSON.stringify(response)}`);
      });
  };

  const handleDeletePreferenceKey = () => {
    if (!isAuthenticated) {
      addLog("Please log in to delete preference key.");
      return;
    }
    client.users()
      .deletePreferenceKey(userId, "theme", (response) => {
        addLog(`Delete preference key response: ${JSON.stringify(response)}`);
      });
  };

  const handleGetPreferences = () => {
    if (!isAuthenticated) {
      addLog("Please log in to get preferences.");
      return;
    }
    client.users()
      .getPreferences(userId, (response) => {
        addLog(`Get preferences response: ${JSON.stringify(response)}`);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-lime-100 to-yellow-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center text-teal-600 mb-4">
          Labels & Preferences Tester
        </h1>

        {/* Description */}
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-6 text-sm text-gray-700">
          <strong>How it works:</strong> Enter a User ID, log in, then test the following:
          <ul className="list-disc ml-4">
            <li><strong>Login</strong>: Redirects to /account-scope for authentication.</li>
            <li><strong>Labels</strong>: Set, get, or delete labels for a user.</li>
            <li><strong>Preferences</strong>: Set, update, delete, or get preferences.</li>
          </ul>
          Check the logs below to see the results!
          <br />
          Uses MongoClient to interact with the server via WebSocket.
        </div>

        {/* User ID Input */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-3 border text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            placeholder="E.g., user123"
          />
        </div>

        {/* Login Button */}
        <div className="mb-6">
          <button
            onClick={handleLogin}
            className="w-full bg-teal-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-teal-600 transition duration-200"
          >
            Login
          </button>
        </div>

        {/* Labels Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleSetLabels}
            className="bg-lime-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-lime-600 transition duration-200"
          >
            Set Labels
          </button>
          <button
            onClick={handleGetLabels}
            className="bg-lime-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-lime-600 transition duration-200"
          >
            Get Labels
          </button>
          <button
            onClick={handleDeleteLabels}
            className="bg-lime-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-lime-600 transition duration-200"
          >
            Delete Labels
          </button>
        </div>

        {/* Preferences Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <button
            onClick={handleSetPreference}
            className="bg-yellow-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-yellow-600 transition duration-200"
          >
            Set Preference
          </button>
          <button
            onClick={handleUpdatePreference}
            className="bg-yellow-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-yellow-600 transition duration-200"
          >
            Update Preference
          </button>
          <button
            onClick={handleDeletePreferenceKey}
            className="bg-yellow-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-yellow-600 transition duration-200"
          >
            Delete Preference
          </button>
          <button
            onClick={handleGetPreferences}
            className="bg-yellow-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-yellow-600 transition duration-200"
          >
            Get Preferences
          </button>
        </div>

        {/* Logs */}
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Logs</h2>
          <ul className="max-h-60 overflow-y-auto text-gray-600">
            {logs.length === 0 ? (
              <li className="text-gray-500">No logs yet...</li>
            ) : (
              logs.map((log, index) => (
                <li key={index} className="mb-2 text-sm">
                  {log}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}