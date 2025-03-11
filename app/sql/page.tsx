"use client";
import React, {useState, useEffect} from 'react'
import {mysqlClient} from '@/utils/bundlers'

const Page = () => {
  const [mysqlChanges, setMysqlChanges] = useState<any[]>([]);
  const [mysqlUsers, setMysqlUsers] = useState<any[]>([]);

  const generateUniqueEmail = () => {
    return `user-${Math.floor(Math.random() * 100000)}@example.com`
  }

   // MySQL műveletek callback-ekkel
   const handleMysqlInsert = () => {
    mysqlClient
      .add("users")
      .query(`INSERT INTO users (name, verified, email, password) VALUES ('Jane Doe', false, '${generateUniqueEmail()}', 'asd')`)
      .setState(setMysqlUsers)
      .callback((response) => console.log("MySQL Insert response:", response))
      .execute();
  };

  const handleMysqlUpdate = (id: number) => {
    mysqlClient
      .update("users")
      .query(`UPDATE users SET name = 'Updated Jane', verified=true WHERE id = ${id}`)
      .setState(setMysqlUsers)
      .callback((response) => console.log("MySQL Update response:", response))
      .execute();
  };

  const handleMysqlDelete = (id: number) => {
    mysqlClient
      .delete("users")
      .query(`DELETE FROM users WHERE id = ${id}`)
      .setState(setMysqlUsers)
      .callback((response) => console.log("MySQL Delete response:", response))
      .execute();
  };

  const handleMysqlGet = () => {
    mysqlClient
      .get("users:get")
      .query("SELECT * FROM users")
      .setState(setMysqlUsers)
      .callback((response) => console.log("MySQL Get response:", response))
      .execute();
  };
  useEffect(() => {
    mysqlClient.listen("users", (data) => {
      console.log("MongoDB change received:", data);
      setMysqlChanges((prev) => [...prev, data.result]);
    });
    return () => {
      mysqlClient.unsubscribe("account");
    }
  }, [mysqlClient]);
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">MySQL</h2>
          <p className="text-sm text-gray-600">
          Frontend database operations with SQL through socket.
        </p>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={handleMysqlInsert}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
                title="Inserts a hardcoded user (e.g., Jane Doe, age 25) into MySQL."
              >
                Insert User
              </button>
              <button
                onClick={handleMysqlGet}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
                title="Fetches all users from MySQL."
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
                      {user.id} {user.name} (verified?: {user.verified})
                      <div>
                        <button
                          onClick={() => handleMysqlUpdate(user.id)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600 mr-2"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleMysqlDelete(user.id)}
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
              <ul className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {mysqlChanges.map((change, index) => (
                  <li key={index} className="bg-blue-100 text-black p-2 rounded-lg animate-fade-in text-sm">
                    {JSON.stringify(change)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
  )
}

export default Page