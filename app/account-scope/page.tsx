"use client";
import React, {useState, useEffect} from 'react'
import { mysqlClient } from '@/utils/bundlers'

const Page = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [accountData, setAccountData] = useState<any>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [accountUpdates, setAccountUpdates] = useState<any[]>([]);
    const [token, setToken] = useState("");

    useEffect(() => {
        mysqlClient.subscribe("account:result", (data) => {
          console.log("Account update received:", data);
          setAccountUpdates((prev) => [...prev, data]);
        })
        return () => {
          mysqlClient.unsubscribe("account");
        }
      }, [mysqlClient]);

      const handleSignUp = () => {
        mysqlClient.signUp(email, password, (response) => {
          console.log("SignUp result:", response);
          if (response.status === "success") {
            setToken(response.token);
            setEmail("");
            setPassword("");
          }
        });
      };
    
      const handleSignIn = () => {
        mysqlClient.signIn(email, password, (response) => {
          console.log("SignIn result:", response);
          if (response.status === "success") {
            setToken(response.token);
            setEmail("");
            setPassword("");
          }
        });
      };
    
      const handleGetAccount = () => {
        mysqlClient.account().get((response) => {
          console.log("Account data:", response);
          if (response.status === "success") {
            setAccountData(response.data);
          }
        });
      };
    
      const handleGetSession = () => {
        mysqlClient.account().getSession((response) => {
          console.log("Session data:", response);
          if (response.status === "success") {
            setSessionData(response.data);
          }
        });
      };
    
      const handleSignOut = () => {
        mysqlClient.account().killSession((response) => {
          console.log("SignOut result:", response);
          if (response.status === "success") {
            setAccountData(null);
            setSessionData(null);
          }
        });
      };
    

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-purple-600 mb-4">Account</h2>
          <p className="text-sm text-gray-600">
          Frontend user account, auth operations with MongoDB (works with sql client as well) through socket.
          JWT token is stored in the cookies and on localstorage for both frontend auth and backend auth.
        </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <input
                type="email"
                className="border text-black p-2 w-full rounded-md"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                className="border text-black p-2 w-full rounded-md"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSignUp}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition duration-300"
                title="Registers a new user with the provided email and password."
              >
                Sign Up
              </button>
              <button
                onClick={handleSignIn}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition duration-300"
                title="Signs in with the provided email and password."
              >
                Sign In
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300"
                title="Signs out and kills the current session."
              >
                Sign Out
              </button>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleGetAccount}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
                title="Fetches the current user's account data."
              >
                Get Account
              </button>
              <button
                onClick={handleGetSession}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
                title="Fetches the current session data."
              >
                Get Session
              </button>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">Account Data:</h3>
              {accountData ? (
                <pre className="bg-gray-100 text-black p-4 rounded-lg mt-2 text-sm overflow-auto max-h-40">
                  {JSON.stringify(accountData, null, 2)}
                </pre>
              ) : (
                <p className="text-black italic">No account data yet</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">Session Data:</h3>
              {sessionData ? (
                <pre className="bg-gray-100 text-black p-4 rounded-lg mt-2 text-sm overflow-auto max-h-40">
                  {JSON.stringify(sessionData, null, 2)}
                </pre>
              ) : (
                <p className="text-black italic">No session data yet</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">Real-time Updates:</h3>
              <ul className="mt-2 space-y-2 text-black max-h-40 overflow-y-auto">
                {accountUpdates.map((update, index) => (
                  <li key={index} className="bg-purple-100 text-black p-2 rounded-lg animate-fade-in text-sm">
                    {JSON.stringify(update)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
  )
}

export default Page