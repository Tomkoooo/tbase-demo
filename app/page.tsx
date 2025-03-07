// App.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Client } from "../utils/socket";
import { ObjectId } from "mongodb";

const App: React.FC = () => {
  const [mongoUsers, setMongoUsers] = useState<any[]>([]);
  const [mysqlUsers, setMysqlUsers] = useState<any[]>([]);
  const [mongoChanges, setMongoChanges] = useState<any[]>([]);
  const [mysqlChanges, setMysqlChanges] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState("general"); // Default channel is "general"
  const [messages, setMessages] = useState<string[]>([]);

  // MongoDB kliens
  const mongoClient = new Client("http://localhost:3000")
    .database("mongodb")
    .connection({
      url: "localhost:27017",
      dbName: "socket-test",
    });

  // MySQL kliens
  const mysqlClient = new Client("http://localhost:3000")
    .database("mysql")
    .connection({
      host: "localhost",
      user: "root",
      password: "",
      database: "socket-test",
    });

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

  // MongoDB műveletek callback-ekkel
  const handleMongoInsert = () => {
    const newUser = { name: "John Doe", age: 30, createdAt: new Date() };
    mongoClient.action(
      "users",
      "insert",
      `collection('users').insertOne(${JSON.stringify(newUser)})`,
      (response) => console.log("MongoDB Insert response:", response),
      setMongoChanges
    );
  };

  const handleMongoUpdate = (id: string) => {
    const updatedUser = { name: "Updated John", age: 31 };
    mongoClient.action(
      "users",
      "update",
      `collection('users').findOneAndUpdate({ _id: "${id}" }, { $set: ${JSON.stringify(updatedUser)} }, { returnDocument: "after" })`,
      (response) => console.log("MongoDB Update response:", response),
      setMongoUsers,
    );
  };

  const handleMongoDelete = (id: string) => {
    mongoClient.action(
      "users",
      "delete",
      `collection('users').deleteOne({ _id: "${id}" })`,
      (response) => console.log("MongoDB Delete response:", response),
      setMongoUsers
    );
  };

  const handleMongoGet = () => {
    mongoClient.action(
      "users",
      "get",
      "collection('users').find().toArray()",
      (response) => console.log("MongoDB Get response:", response),
      setMongoUsers,
    );
    console.log(mongoUsers);
  };

  // MySQL műveletek callback-ekkel
  const handleMysqlInsert = () => {
    mysqlClient.action(
      "users",
      "insert",
      `INSERT INTO users (name, age, id) VALUES ('Jane Doe', 25 ${Math.floor(Math.random() * 1000)})`,
      (response) => console.log("MySQL Insert response:", response),
      setMysqlUsers,
    );
  };

  const handleMysqlUpdate = (id: number) => {
    mysqlClient.action(
      "users",
      "update",
      `UPDATE users SET name = 'Updated Jane', age = 26 WHERE id = ${id}`,
      (response) => console.log("MySQL Update response:", response),
      setMysqlUsers,
    );
  };

  const handleMysqlDelete = (id: number) => {
    mysqlClient.action(
      "users",
      "delete",
      `DELETE FROM users WHERE id = ${id}`,
      (response) => console.log("MySQL Delete response:", response),
      setMysqlUsers,
    );
  };

  const handleMysqlGet = () => {
    mysqlClient.action(
      "users",
      "get",
      "SELECT * FROM users",
      (response) => console.log("MySQL Get response:", response),
      setMysqlUsers
    );
  };

  // Real-time változások figyelése
  useEffect(() => {
    mongoClient.listen("users", (data) => {
      console.log("MongoDB change received:", data);
      setMongoChanges((prev) => [...prev, data.result.insertedId]);
    });
    return () => {
      mongoClient.unsubscribe("users");
    };
  }, [mongoClient]);

  useEffect(() => {
    mysqlClient.listen("mysql-users", (data) => {
      console.log("MySQL change received:", data.change);
      setMysqlChanges((prev) => [...prev, data.change]);
    });
    return () => {
      mysqlClient.unsubscribe("users");
    };
  }, [mysqlClient]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="w-full flex justify-center items-center flex-col mb-8">
        <h1 className="text-4xl font-bold text-center text-gray-800 ">TSocket Test</h1>
        <span className="text-gray-800 italic">(hover for tooltip)</span>
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* MongoDB szekció */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">MongoDB</h2>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={handleMongoInsert}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
                title="Inserts a hardcoded user (e.g., John Doe, age 30) into MongoDB. This action is sent via socket, listened by all clients, and the new _id is shared in real-time."
              >
                Insert User
              </button>
              <button
                onClick={handleMongoGet}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
                title="Runs raw NoSQL query 'find().toArray()' on the client side, fetches all users from MongoDB via socket, and updates the list. Other clients can subscribe to receive this data."
              >
                Get Users
              </button>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">Users:</h3>
              {mongoUsers.length > 0 ? (
                <ul className="bg-gray-100 text-black p-4 rounded-lg mt-2 text-sm overflow-auto max-h-40">
                  {mongoUsers.map((user) => (
                    <li key={user._id} className="flex justify-between items-center py-1">
                      {user._id} {user.name} (Age: {user.age})
                      <div>
                        <button
                          onClick={() => handleMongoUpdate(user._id)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600 mr-2"
                          title="Updates this user in MongoDB with hardcoded values (e.g., Updated John, age 31) via socket. All clients listening to 'users' will see the change."
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleMongoDelete(user._id)}
                          className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                          title="Deletes this user from MongoDB using its _id via socket. The deletion is reflected in real-time across all subscribed clients."
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-black italic">No users yet</p>
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
  
        {/* MySQL szekció */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">MySQL</h2>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={handleMysqlInsert}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
                title="Inserts a hardcoded user (e.g., Jane Doe, age 25) into MySQL. This action is sent via socket, listened by all clients, and the new id is shared in real-time."
              >
                Insert User
              </button>
              <button
                onClick={handleMysqlGet}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
                title="Runs raw SQL query 'SELECT * FROM users' on the client side, fetches all users from MySQL via socket, and updates the list. Other clients can subscribe to this data."
              >
                Get Users
              </button>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">Users:</h3>
              {mysqlUsers.length > 0 ? (
                <ul className="bg-gray-100 text-black p-4 rounded-lg mt-2 text-sm overflow-auto max-h-40">
                  {mysqlUsers.map((user) => (
                    <li key={user.id} className="flex justify-between items-center py-1">
                      {user.name} (Age: {user.age})
                      <div>
                        <button
                          onClick={() => handleMysqlUpdate(user.id)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600 mr-2"
                          title="Updates this user in MySQL with hardcoded values (e.g., Updated Jane, age 26) via socket. All clients listening to 'users' will see the change."
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleMysqlDelete(user.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                          title="Deletes this user from MySQL using its id via socket. The deletion is reflected in real-time across all subscribed clients."
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-black italic">No users yet</p>
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
  
      {/* Chat szekció */}
      <div className="p-4 max-w-md mx-auto text-black mt-8">
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
            title="Sends the typed message to the current channel via socket. All clients subscribed to this channel will receive it in real-time."
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
            title="Changes the chat channel. Messages will be sent to and received from the new channel via socket."
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