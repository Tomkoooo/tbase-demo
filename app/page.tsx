// App.tsx
"use client"
import React, { useEffect, useState } from "react";
import { Client } from "../utils/socket";

const App: React.FC = () => {
  const [mongoUsers, setMongoUsers] = useState<any[]>([]);
  const [mysqlUsers, setMysqlUsers] = useState<any[]>([]);
  const [mongoChanges, setMongoChanges] = useState<any[]>([]);
  const [mysqlChanges, setMysqlChanges] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState("general"); // Default channel is "general"
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    mongoClient.subscribe(channel, (message: any) => {
      console.log(message);
      setMessages((prev) => [...prev, message.message]); // Append the new message
    });

    return () => {
      mongoClient.unsubscribe(channel);

    };
  }, [channel]);

  const sendMessage = () => {
    if (input.trim()) {
      mongoClient.send(channel, input);
      setInput(""); // Clear input after sending
    }
  };

  // MongoDB kliens
  const mongoClient = new Client("http://localhost:3000")
    .database("mongodb")
    .connection({ url: "connection string", 
      dbName: "db name" });

  // MySQL kliens
  const mysqlClient = new Client("http://localhost:3000")
    .database("mysql")
    .connection({
      host: "localhost",
      user: "root",
      password: "password",
      database: "mydb",
    });

    const handleMongoQuery = () => {
      mongoClient.action("get-user", "collection('users').findOne()", (response) => {
        if (response.result) {
          setMongoUsers([response.result]);
        } else {
          console.error("MongoDB error:", response);
        }
      });
    };
  
    const handleMysqlQuery = () => {
      mysqlClient.action("users", "SELECT * FROM users LIMIT 1", (response) => {
        if (response.result) {
          setMysqlUsers(response.result);
        } else {
          console.error("MySQL error:", response);
        }
      });
    };
  
    const handleMongoAddUser = () => {
      const newUser = {
        name: "John Doe",
        age: 30,
        createdAt: new Date(),
      };
      mongoClient.action(
        "users",
        `collection('users').insertOne(${JSON.stringify(newUser)})`,
        (response) => {
          if (response.result) {
            console.log("User added to MongoDB:", response.result);
          } else {
            console.error("MongoDB add error:", response.error);
          }
        }
      );
    };
  
    const handleMysqlAddUser = () => {
      mysqlClient.action(
        "users",
        "INSERT INTO users (name, age) VALUES ('Jane Doe', 25)",
        (response) => {
          if (response.status === "success") {
            console.log("User added to MySQL:", response.result);
          } else {
            console.error("MySQL add error:", response.error);
          }
        }
      );
    };
  
    useEffect(() => {
      mongoClient.listen("users", (data) => {
        console.log("MongoDB change received:", data.change);
        setMongoChanges((prev) => [...prev, data.change]);
      });
      return () => {mongoClient.unsubscribe("users")};
    }, [mongoClient]);
  
    useEffect(() => {
      mysqlClient.listen("users", (data) => {
        console.log("MySQL change received:", data.change);
        setMysqlChanges((prev) => [...prev, data.change]);
      });
      return () =>{ mysqlClient.unsubscribe("users")};
    }, [mysqlClient]);
  
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">Database Tester</h1>
  
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">MongoDB</h2>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={handleMongoQuery}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
                >
                  Get One User
                </button>
                <button
                  onClick={handleMongoAddUser}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
                >
                  Add User
                </button>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-700">Queried User:</h3>
                {mongoUsers.length > 0 ? (
                  <pre className="bg-gray-100 text-black p-4 rounded-lg mt-2 text-sm overflow-auto">
                    {JSON.stringify(mongoUsers[0], null, 2)}
                  </pre>
                ) : (
                  <p className="text-black italic">No user queried yet</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-700">Real-time Changes (Listen):</h3>
                <ul className="mt-2 space-y-2 text-black max-h-40 overflow-y-auto">
                  {mongoChanges.map((change, index) => (
                    <li
                      key={index}
                      className="bg-green-100 text-black p-2 rounded-lg animate-fade-in text-sm"
                    >
                      {JSON.stringify(change)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
  
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">MySQL</h2>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={handleMysqlQuery}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
                >
                  Get One User
                </button>
                <button
                  onClick={handleMysqlAddUser}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
                >
                  Add User
                </button>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-700">Queried User:</h3>
                {mysqlUsers.length > 0 ? (
                  <pre className="bg-gray-100 p-4 text-black rounded-lg mt-2 text-sm overflow-auto">
                    {JSON.stringify(mysqlUsers[0], null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">No user queried yet</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-700">Real-time Changes (Listen):</h3>
                <ul className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {mysqlChanges.map((change, index) => (
                    <li
                      key={index}
                      className="bg-blue-100 text-black p-2 rounded-lg animate-fade-in text-sm"
                    >
                      {JSON.stringify(change)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 max-w-md mx-auto text-black">
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
      </div>
    );
  };
  
  export default App;