// socket.ts
import { io, Socket } from "socket.io-client";
import { Account } from "./socket/account";
import { Users } from "./socket/users";
import { Channels } from "./socket/channel";
import { Database } from "./socket/database"; // Új import

interface ConnectionInfo {
  url?: string;
  dbName?: string;
  user?: string;
  password?: string;
  host?: string;
  database?: string;
  port?: number;
}

export class ClientConnection {
  private socket: Socket;
  private dbType: string | null = null;
  private connectionInfo: ConnectionInfo | null = null;
  private isInitialized = false;

  // Alosztályok
  public account: Account;
  public users: Users;
  public channels: Channels;
  public database: Database;

  constructor(url: string = "localhost:3000") {
    this.socket = io(url);
    this.account = new Account(this.socket);
    this.users = new Users(this.socket, this);
    this.channels = new Channels(this.socket, this);
    this.database = new Database(this.socket, this);
  }

  public async initialize(dbType: "mongodb" | "mysql", connectionInfo: ConnectionInfo): Promise<void> {
    if (this.isInitialized) return;

    this.dbType = dbType;
    this.connectionInfo = connectionInfo;

    return new Promise((resolve, reject) => {
      this.socket.emit("initialize", { dbType, connectionInfo });
      this.socket.once("initialized", () => {
        this.isInitialized = true;
        console.log("Client initialized");
        resolve();
      });
      this.socket.once("error", (error: any) => reject(new Error(error.message)));
    });
  }

  public getSocket(): Socket {
    return this.socket;
  }

  public close(): void {
    this.socket.close();
  }
}