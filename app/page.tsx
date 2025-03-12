"use client";
import React from "react";
import Link  from "next/link";
import webPush from "web-push";

const App: React.FC = () => {
  const demoSections = [
    {
      title: "MongoDB Demo",
      description: "Interact with MongoDB: Insert, update, delete, and fetch users with real-time updates. Execute queries on the frontend.",
      path: "/mongodb",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "MySQL Demo",
      description: "Manage MySQL users: Add, modify, remove, and list with real-time change tracking. Execute queries on the frontend.",
      path: "/sql",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Account-scope Demo",
      description: "Test user authentication: Sign up, sign in, sign out, and view account/session data.",
      path: "/account-scope",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "Users-scope Demo",
      description: "Monitor real-time online users and fetch all registered users. Manage users on MongoDB or MySQL on the frontend.",
      path: "/users-scope",
      color: "bg-indigo-500 hover:bg-indigo-600",
    },
    {
      title: "Chat Demo",
      description: "Send and receive socket messages in real-time across custom channels with one class and 10 lines out of the box.",
      path: "/chat",
      color: "bg-teal-500 hover:bg-teal-600",
    },
    {
      title: "Notification Demo",
      description: "Test push notifications: Subscribe, unsubscribe, and send notifications to users with real-time updates.",
      path: "/notification",
      color: "bg-yellow-500 hover:bg-yellow-600",
    },
    {
      title: "Bucket API Demo",
      description: "Upload and download files to/from the server with a simple API. Manage files with MongoDB or MySQL.",
      path: "/bucket",
      color: "bg-red-500 hover:bg-red-600",
    },
    {
      title: "Permission Managment Demo",
      description: "Manage user and document|routes permissions: Create, update, delete, and list and check permissions for users.",
      path: "/permissions",
      color: "bg-pink-500 hover:bg-pink-600",
    },
    {
      title: "Team Managment Demo",
      description: "Create and manage teams with customization and user permissions. Manage teams on MongoDB or MySQL.",
      path: "/teams",
      color: "bg-gray-500 hover:bg-gray-600",
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex justify-center items-center flex-col mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4 text-center">TBase a socket based BaaS</h1>
        <p className="text-xl text-gray-600 text-center max-w-2xl">
          Welcome to the TSocket Test Platform! Explore real-time database interactions,costum database queries (with SQL injection protection) on the frontend, user authentication, online user tracking, file managment, push notification manager and chat functionality with a single class and without any API route with both using MongoDB and MySQL with Socket.IO integration.
        </p>
        <span className="text-gray-500 italic mt-2">Click on cards for more info</span>
      </div>

      {/* Demo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl">
        {demoSections.map((section) => (
          <Link key={section.title} href={section.path} className="group">
            <div
              className={`shadow-lg rounded-lg p-6 text-white ${section.color} transform transition duration-300 group-hover:scale-105 group-hover:shadow-xl`}
            >
              <h2 className="text-2xl font-semibold mb-2">{section.title}</h2>
              <p className="text-sm opacity-90 group-hover:opacity-100">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-gray-500 text-center">
        <p>Built with NextJS, TypeScript, and Socket.IO | © 2025 TSocket Test</p>
      </footer>
    </div>
  );
};

export default App;