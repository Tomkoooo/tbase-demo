// users.ts
import { Socket } from "socket.io-client";
import { ClientConnection as Client } from "../socket"; // Feltételezem, hogy a Client osztály innen importálható

export class Users {
  private socket: Socket;
  private client: Client;

  constructor(socket: Socket, client: Client) {
    this.socket = socket;
    this.client = client;
  }

  public listAll(callback: (data: any[]) => void): Client {
    this.socket.emit("users:action", { action: "listAll" });
    this.socket.once("users:result", (response) => callback(response.users || []));
    return this.client;
  }

  public listOnline(callback: (data: any[]) => void): Client {
    this.socket.emit("users:action", { action: "listOnline" });
    this.socket.once("users:result", (response) => callback(response.users || []));
    return this.client;
  }

  public listenOnlineUsers(callback: (data: any[]) => void): Client {
    this.socket.emit("users:action", { action: "listenOnlineUsers" });
    this.socket.on("users:onlineChanged", (onlineUsers) => callback(onlineUsers || []));
    return this.client;
  }

  public getUser(userId: string, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "getUser", data: { userId } });
    this.socket.once("users:result", (response) => callback(response.user || {}));
    return this.client;
  }

  public getUsersFromId(userIds: string[], callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "getUsersFromId", data: { userIds } });
    this.socket.once("users:result", (response) => callback(response.users || []));
    return this.client;
  }

  // Labels Management
  public setLabels(userId: string, labels: string[], callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "setLabels", data: { userId, labels } });
    this.socket.once("users:result", (response) => callback(response));
    return this.client;
  }

  public getLabels(userId: string, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "getLabels", data: { userId } });
    this.socket.once("users:result", (response) => callback(response.labels || []));
    return this.client;
  }

  public deleteLabels(userId: string, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "deleteLabels", data: { userId } });
    this.socket.once("users:result", (response) => callback(response));
    return this.client;
  }

  // Preferences Management
  public setPreference(userId: string, key: string, value: any, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "setPreference", data: { userId, key, value } });
    this.socket.once("users:result", (response) => callback(response));
    return this.client;
  }

  public updatePreference(userId: string, key: string, value: any, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "updatePreference", data: { userId, key, value } });
    this.socket.once("users:result", (response) => callback(response));
    return this.client;
  }

  public deletePreferenceKey(userId: string, key: string, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "deletePreferenceKey", data: { userId, key } });
    this.socket.once("users:result", (response) => callback(response));
    return this.client;
  }

  public getPreferences(userId: string, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "getPreferences", data: { userId } });
    this.socket.once("users:result", (response) => callback(response.preferences || {}));
    return this.client;
  }

  // Superuser metódusok
  public deleteUser(userId: string, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "deleteUser", data: { userId } });
    this.socket.once("users:result", (response) => callback(response));
    return this.client;
  }

  public createUser(name: string, email: string, password: string, isSuper: boolean, callback: (data: any) => void): Client {
    this.socket.emit("users:action", { action: "createUser", data: { name, email, password, isSuper } });
    this.socket.once("users:result", (response) => callback(response));
    return this.client;
  }
}