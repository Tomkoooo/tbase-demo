//EXAMPLE for server-side authentication and server side usage of the database class in NextJs
import { NextRequest } from 'next/server';
import {Database, MongoDB, MySQLDB} from './database';
import Notification from './notification';

//This function is used to check if the user is authenticated
export const getSession = async (sessionId: string) => {
    const db = new Database(new MongoDB({
        url: "mongodb://localhost:27017",
        dbName: "socket-test",
      }));
    if(!sessionId) return null;
    return await db.getSession(sessionId);
}

//This function is used to get the user data
export const getUser = async (req: NextRequest) => {
    const db = new Database(new MongoDB({
        url: "mongodb://localhost:27017",
        dbName: "socket-test",
      }));
    const session = req.cookies.get('t_auth');
    if(!session) return null;
    const userId = await getSession(session.value);
    if(!userId) return null;
    const user = await db.getAccount(userId.userId);
    return user;
}

//This function is used to execute a query
export const executeQuery = async (query: string) => {
    const db = new Database(new MySQLDB({
        host: "localhost",
        user: "root",
        port: 3306,
        database: "socket-test",
      }));
    return await db.execute(query);
}

//send notification to a specific user after they subscribed
export const sendNotification = async (userId: string, title: string, message: string) => {
    const notification = new Notification();
    const obj = {title: title, message: message};
    return await notification.send(userId, obj);
}

//NOTE: all database methods are async and can be used in server-side