// socket/socket.ts
import { io, Socket } from "socket.io-client";
import { Account } from "./socket/account";
import { Users } from "./socket/users";
import { Channels } from "./socket/channel";
import { Database } from "./socket/database";
import { subscribeNotification } from "./socket/notification";
import { Bucket } from "./socket/bucket";
import { Permission } from "./socket/permission"; // Permission importálása
import { Teams } from "./socket/teams"; // Teams importálása

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

  public account: Account;
  public users: Users;
  public channels: Channels;
  public database: Database;
  public notification: subscribeNotification;
  public bucket: Bucket;
  public permission: Permission; // Permission hozzáadása
  public publicVapidKey: string;
  public teams: Teams; // Teams hozzáadása

  constructor(url: string = "localhost:3000") {
    this.socket = io(url);
    this.account = new Account(this.socket);
    this.users = new Users(this.socket, this);
    this.channels = new Channels(this.socket, this);
    this.database = new Database(this.socket, this);
    this.notification = new subscribeNotification(this.socket, this);
    this.bucket = new Bucket(this.socket, this);
    this.permission = new Permission(this.socket, this); // Permission inicializálása
    this.teams = new Teams(this.socket, this); // Teams inicializálása
    this.publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC!;
    if (!this.publicVapidKey) {
      throw new Error("Public Vapid Key is not set");
    }
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