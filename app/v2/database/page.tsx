"use client";
import React, { useState, useEffect } from "react";
import { mongoClient } from "@/utils/bundler_v2";

const Page = () => {
  const [mongoUsers, setMongoUsers] = useState<any[]>([]);
  const [mongoChanges, setMongoChanges] = useState<any[]>([]);

  // MongoDB műveletek callback-ekkel
  const handleMongoInsert = () => {
    const newUser = { name: "John Doe", age: 30, createdAt: new Date() };
    console.log("Inserting user...");
    mongoClient.database
      .insert("users")
      .query(`collection('users').insertOne(${JSON.stringify(newUser)})`)
      .setState(setMongoUsers)
      .callback((response) => console.log("MongoDB Add response:", response))
      .execute();
  };

  const handleMongoUpdate = (id: string) => {
    const updatedUser = { name: "Updated John", age: 31 };
    mongoClient.database
      .update("users")
      .query(
        `collection('users').findOneAndUpdate({ _id: "${id}" }, { $set: ${JSON.stringify(updatedUser)} }, { returnDocument: "after" })`
      )
      .setState(setMongoUsers)
      .callback((response) => console.log("MongoDB Update response:", response))
      .execute();
  };

  const handleMongoDelete = (id: string) => {
    mongoClient.database
      .delete("users")
      .query(`collection('users').deleteOne({ _id: "${id}" })`)
      .setState(setMongoUsers)
      .callback((response) => console.log("MongoDB Delete response:", response))
      .execute();
  };

  const handleMongoGet = () => {
    mongoClient.database
      .get("users")
      .query("collection('users').find().toArray()")
      .setState(setMongoUsers)
      .callback((response) => console.log("MongoDB Get response:", response))
      .execute();
  };

  useEffect(() => {
    // Valós idejű változások figyelése az új databaseListen metódussal
    mongoClient.channels.databaseListen(
      "users",
      (response) => {
        console.log("MongoDB change received:", response);
        if (response.status === "success" && response.result) {
          setMongoChanges((prev) => [...prev, response.result]);
        }
      }
    );

    // Cleanup (leiratkozás a csatornáról)
    return () => {
      mongoClient.channels.unsubscribe("users"); // "account" helyett "users", mert itt a "users" csatornát figyeljük
    };
  }, []);

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-green-600 mb-4">MongoDB</h2>
      <p className="text-sm text-gray-600">
        Frontend database operations with MongoDB through socket.
      </p>
      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={handleMongoInsert}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
            title="Inserts a hardcoded user (e.g., John Doe, age 30) into MongoDB."
          >
            Insert User
          </button>
          <button
            onClick={handleMongoGet}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
            title="Fetches all users from MongoDB."
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
                    >
                      Update
                    </button>
                    <button
                      onClick={() => handleMongoDelete(user._id)}
                      className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
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
          <h3 className="text-lg font-medium text-gray-700">Real-time Changes:</h3>
          <ul className="mt-2 space-y-2 text-black max-h-40 overflow-y-auto">
            {mongoChanges.map((change, index) => (
              <li key={index} className="bg-green-100 text-black p-2 rounded-lg animate-fade-in text-sm">
                {JSON.stringify(change)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Page;