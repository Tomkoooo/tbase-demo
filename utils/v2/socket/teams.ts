// socket/teams.ts
import { Socket } from "socket.io-client";
import { ClientConnection } from "../socket";

export class Teams {
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

  public async createTeam(name: string, styling: string, creatorId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "create", name, styling, creatorId, token });
      this.socket.once("team:created", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async getTeam(teamId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "get", teamId, token });
      this.socket.once("team:result", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async getTeams(userId: string | null): Promise<any[]> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "getAll", userId, token });
      this.socket.once("team:list", (data: any[]) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async updateTeam(teamId: string, name: string, styling: string, userId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "update", teamId, name, styling, userId, token });
      this.socket.once("team:updated", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async deleteTeam(teamId: string, userId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "delete", teamId, userId, token });
      this.socket.once("team:deleted", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async addTeamUser(teamId: string, userId: string, role: string, addedBy: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "addUser", teamId, userId, role, addedBy, token });
      this.socket.once("team:userAdded", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async removeTeamUser(teamId: string, userId: string, removedBy: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "removeUser", teamId, userId, removedBy, token });
      this.socket.once("team:userRemoved", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async updateTeamUserRole(teamId: string, userId: string, role: string, updatedBy: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "updateUserRole", teamId, userId, role, updatedBy, token });
      this.socket.once("team:userRoleUpdated", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async updateTeamUserLabels(teamId: string, userId: string, labels: string[], updatedBy: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "updateUserLabels", teamId, userId, labels, updatedBy, token });
      this.socket.once("team:userLabelsUpdated", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async leaveTeam(teamId: string, userId: string): Promise<any> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "leave", teamId, userId, token });
      this.socket.once("team:userLeft", (data: any) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  public async listTeams(): Promise<any[]> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "listAll", token });
      this.socket.once("team:list", (data: any[]) => resolve(data));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  // Új: Csapat jogosultság ellenőrzése
  public async checkTeamPermission(teamId: string, userId: string, requiredPermission: string): Promise<boolean> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "checkPermission", teamId, userId, requiredPermission, token });
      this.socket.once("team:permissionCheck", ({ hasPermission }: { hasPermission: boolean }) => resolve(hasPermission));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }

  // Új: Csapat jogosultság matematikai ellenőrzése
  public async evaluateTeamPermission(teamId: string, userId: string, expression: string): Promise<boolean> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");
    return new Promise((resolve, reject) => {
      this.socket.emit("teams:action", { action: "evaluatePermission", teamId, userId, expression, token });
      this.socket.once("team:permissionEvaluate", ({ result }: { result: boolean }) => resolve(result));
      this.socket.once("error", ({ message }: { message: string }) => reject(new Error(message)));
    });
  }
}