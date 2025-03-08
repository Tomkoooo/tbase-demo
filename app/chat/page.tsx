"use client";
import React, {useState, useEffect} from 'react'
import { client} from '@/utils/clientBundler'
const Page = () => {
    const [channel, setChannel] = useState("general"); // Default channel is "general"
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState("");
    // Chat funkciók
  useEffect(() => {
    client.subscribe(channel, (message: any) => {
      console.log("Chat message received:", message);
      setMessages((prev) => [...prev, message.message]);
    });

    return () => {
      client.unsubscribe(channel);
    };
  }, [channel]);

  const sendMessage = () => {
    if (input.trim()) {
      client.send(channel, input);
      setInput("");
    }
  };
  return (
    <div className="p-4 max-w-md mx-auto text-black mt-8">
        <h1 className="text-lg font-bold">Chat - {channel}</h1>
        <p className="text-sm text-gray-600">
          Message room live chat with only the socket class.
        </p>
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
            title="Sends the typed message to the current channel."
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
  )
}

export default Page