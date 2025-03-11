"use client"
import React, {useState, useEffect} from 'react'
import { mongoClient } from '@/utils/bundlers'
import Link from 'next/link';

const Page = () => {
    const [realTimeOnlineUsers, setRealTimeOnlineUsers] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);


    const handleGetAccount = () => {
        mongoClient.account().get((response) => {
          console.log("Account data:", response);
          if (response.status === "success") {
            console.log("Account data:", response.data);
          }
        });
      };

    useEffect(() => {
        mongoClient.users().listenOnlineUsers((data) => {
          setRealTimeOnlineUsers(data);
      });
        return () => {
          mongoClient.unsubscribe("users");
        }
      }, [mongoClient]);
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
    <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Online Users (Real-time)</h2>
    <p className="text-sm text-gray-600">
      Real-time online users list with MongoDB works with the mongoClient aswell.
      Client side user fetching and listing.

      To authenticate with the button here use the same databse clint in account-scope and users-scope page
    </p>
    <div className="space-y-4">
      {/* Valós idejű online felhasználók */}
      <div className='flex gap-3 w-full items-center text-black'>
        <span>After login</span>
        <Link href='/account-scope' className='underline text-blue'> here (account-scpoe) </Link>
        <button onClick={handleGetAccount} className='rounded-xl bg-green-400 p-4 lex items-center justify-center'>run the frontend auth (account.get or account.getSession).</button>
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-700">Currently Online:</h3>
        {realTimeOnlineUsers.length > 0 ? (
          <ul className="bg-indigo-100 text-black p-4 rounded-lg mt-2 text-sm overflow-auto max-h-40">
            {realTimeOnlineUsers.map((user) => (
              <li key={user._id || user.id} className="py-1 animate-fade-in">
                {user.email} (ID: {user._id || user.id})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black italic">No online users yet</p>
        )}
      </div>
  
      {/* Gomb az összes felhasználó lekérdezéséhez és az eredmények megjelenítése */}
      <div>
        <button
          onClick={() => {
            mongoClient.users().listAll((data) => {
              console.log("All users:", data);
              setAllUsers(data); // Feltételezem, hogy az allUsers állapot már létezik az App.tsx-ben
            });
          }}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition duration-300"
          title="Fetches and displays all registered users."
        >
          Get All Users
        </button>
        <h3 className="text-lg font-medium text-gray-700 mt-4">All Users:</h3>
        {allUsers.length > 0 ? (
          <ul className="bg-gray-100 text-black p-4 rounded-lg mt-2 text-sm overflow-auto max-h-40">
            {allUsers.map((user) => (
              <li key={user._id || user.id} className="py-1">
                {user.email} (ID: {user._id || user.id})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black italic">No users fetched yet</p>
        )}
      </div>
    </div>
  </div>
  )
}

export default Page