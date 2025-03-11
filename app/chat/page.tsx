"use client";

import React, { useState, useEffect } from "react";
import { mongoClient } from "@/utils/bundlers";

const Page = () => {
  const [channel, setChannel] = useState("general"); // Default channel is "general"
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  // Chat funkciók
  useEffect(() => {
    mongoClient.subscribe(channel, (message: any) => {
      console.log("Chat message received:", message);
      setMessages((prev) => [...prev, message.message]);
    });

    return () => {
      mongoClient.unsubscribe(channel);
    };
  }, [channel]);

  const sendMessage = () => {
    if (input.trim()) {
      mongoClient.send(channel, input);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        {/* Header */}
        <h1 className="text-4xl font-extrabold text-center text-indigo-600 mb-2">Live Chat</h1>
        <p className="text-center text-gray-600 mb-6">
          Real-time messaging powered by sockets. Switch channels and chat instantly!
        </p>

        {/* Channel Display and Input */}
        <div className="mb-6">
          <label className="text-2xl font-bold text-purple-700 mb-2 block">Current Channel: {channel}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Enter channel name"
              className="grow bg-gray-50 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Message Input */}
        <div className="mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 placeholder-gray-400"
          />
          <button
            onClick={sendMessage}
            className="mt-2 w-full bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-200"
            title="Sends the typed message to the current channel."
          >
            Send Message
          </button>
        </div>

        {/* Messages List */}
        <div className="max-h-64 overflow-y-auto">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Messages</h2>
          {messages.length === 0 ? (
            <p className="text-gray-600 text-center">No messages yet. Start chatting!</p>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, idx) => (
                <li
                  key={idx}
                  className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700 hover:bg-gray-100 transition duration-200"
                >
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;