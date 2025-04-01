// socket/permission.ts
import { Socket } from "socket.io-client";
import { ClientConnection } from "../socket";

export class Permission {
  private socket: Socket;
  private client: ClientConnection;

  constructor(socket: Socket, client: ClientConnection) {
    this.socket = socket;
    this.client = client;
  }

  private initializeIfNeeded(): void {
    if (this.client["connectionInfo"]) {
      this.client.initialize(this.client["dbType"] as "mongodb", this.client["connectionInfo"]);
    }
  }

  public async createPermission(itemId: string, requireAction: string, requireRole: string | null): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("permission:action", { action: "create", itemId, requireAction, requireRole, token });
      this.socket.once("permission:created", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async getPermission(permissionId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("permission:action", { action: "get", permissionId, token });
      this.socket.once("permission:result", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async getPermissions(itemId: string | null): Promise<any[]> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("permission:action", { action: "getAll", itemId, token });
      this.socket.once("permission:list", (data: any[]) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async updatePermission(permissionId: string, itemId: string, requireAction: string, requireRole: string | null): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("permission:action", { action: "update", permissionId, itemId, requireAction, requireRole, token });
      this.socket.once("permission:updated", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async deletePermission(permissionId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("permission:action", { action: "delete", permissionId, token });
      this.socket.once("permission:deleted", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async createUserPermission(userId: string, onDoc: string, permission: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("userPermission:action", { action: "create", userId, onDoc, permission, token });
      this.socket.once("userPermission:created", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async getUserPermissions(userId: string, onDoc: string | null): Promise<any[]> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("userPermission:action", { action: "getAll", userId, onDoc, token });
      this.socket.once("userPermission:list", (data: any[]) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async updateUserPermission(permissionId: string, onDoc: string, permission: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("userPermission:action", { action: "update", permissionId, onDoc, permission, token });
      this.socket.once("userPermission:updated", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async deleteUserPermission(permissionId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("userPermission:action", { action: "delete", permissionId, token });
      this.socket.once("userPermission:deleted", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async checkUserPermission(userId: string, onDoc: string, requiredPermission: string): Promise<boolean> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("userPermission:action", { action: "check", userId, onDoc, requiredPermission, token });
      this.socket.once("userPermission:check", ({ hasPermission }: { hasPermission: boolean }) => resolve(hasPermission));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  // Új: Matematikai függvény alapú ellenőrzés
  public async evaluatePermission(userId: string, onDoc: string, expression: string): Promise<boolean> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("userPermission:action", { action: "evaluate", userId, onDoc, expression, token });
      this.socket.once("userPermission:evaluate", ({ result }: { result: boolean }) => resolve(result));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }
}