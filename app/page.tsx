// pages/index.tsx
"use client"
import { useEffect, useState } from "react";
import { Client } from "../utils/socket";


const client = new Client(); // Create a new client instance

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState("general"); // Default channel is "general"

  useEffect(() => {
    client.subscribe(channel, (message: any) => {
      console.log(message);
      setMessages((prev) => [...prev, message.message]); // Append the new message
    });

    return () => {
      client.unsubscribe(channel);

    };
  }, [channel]);

  const sendMessage = () => {
    if (input.trim()) {
      client.send(channel, input);
      setInput(""); // Clear input after sending
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold">Chat - {channel}</h1>

      <div className="mb-4">
        <input
          type="text"
          className="border p-2 w-full rounded-md"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={sendMessage}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Send Message
        </button>
      </div>

      <div>
        <label className="block mb-2">Change Channel:</label>
        <input
          type="text"
          className="border p-2 w-full rounded-md"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="Enter channel name"
        />
      </div>

      <ul className="mt-4">
        {messages.map((msg, idx) => (
          <li key={idx} className="p-2 border-b">
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
}
