"use client";

import { useState, useEffect } from "react";
import { client } from "@/utils/bundlers";

export default function Home() {
  const [userId, setUserId] = useState<string>("user123"); // Default user ID
  const [logs, setLogs] = useState<string[]>([]);

  // Log helper
  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // Handle subscribe
  const handleSubscribe = async () => {
    if (!client) return;
    try {
      await client.subscribeToNotification(userId);
      addLog(`Subscribed ${userId}`);
    } catch (error: any) {
      addLog(`Subscribe error: ${error.message}`);
    }
  };

  // Handle unsubscribe
  const handleUnsubscribe = async () => {
    if (!client) return;
    try {
      await client.unsubscribeFromNotification(userId);
      addLog(`Unsubscribed ${userId}`);
    } catch (error: any) {
      addLog(`Unsubscribe error: ${error.message}`);
    }
  };

  // Handle send notification
  const handleSendNotification = () => {
    if (!client) return;
    try {
      client.sendNotification(userId, {
        title: "Test Notification",
        message: `Hello ${userId}! This is a test.`,
      });
      addLog(`Sent notification to ${userId}`);
    } catch (error: any) {
      addLog(`Send error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-lg w-full">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-4">
          Push Notification Tester
        </h1>

        {/* Description */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-sm text-gray-700">
            <strong>How it works:</strong> Enter a User ID, then:
            <ul className="list-disc ml-4">
              <li><strong>Subscribe</strong>: Register for notifications.</li>
              <li><strong>Unsubscribe</strong>: Remove notification subscription.</li>
              <li><strong>Send Notification</strong>: Send a test notification.</li>
            </ul>
            Check the logs below to see what happens!
            <br/>
            This only using the notification class without any additional backend code.
            <br/>
            Note. multiple device with the same user id will receive the notification.
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
            className="w-full p-3 border text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="E.g., user123"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleSubscribe}
            className="flex-1 bg-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-600 transition duration-200"
          >
            Subscribe
          </button>
          <button
            onClick={handleUnsubscribe}
            className="flex-1 bg-red-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-600 transition duration-200"
          >
            Unsubscribe
          </button>
          <button
            onClick={handleSendNotification}
            className="flex-1 bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-200"
          >
            Send Notification
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