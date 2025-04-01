// account.ts
import { Socket } from "socket.io-client";

export class Account {
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  private getCookie(cname: string) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  private setCookie(name: string, value: string, days: number = 1) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}`;
  }

  private getToken() {
    return localStorage.getItem("t_auth");
  }

  public signUp(name: string, email: string, password: string, isSuper: boolean = false, callback: (data: any) => void): void {
    const userData = { name, isSuper, email, password, createdAt: new Date() };
    this.socket.emit("account:action", { action: "signup", data: userData });
    this.socket.once("account:result", (response) => {
      if (response.status === "success" && response.token && response.sessionId) {
        this.setCookie("t_auth", response.sessionId);
        localStorage.setItem("t_auth", response.token);
        if (isSuper) {
          this.setCookie("t_auth_super", response.sessionId);
          localStorage.setItem("t_auth_super", response.token);
        }
      }
      callback(response);
    });
  }

  public signIn(user: string, password: string, isSuper: boolean = false, callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "signin", data: { user, password, isSuper } });
    this.socket.once("account:result", (response) => {
      if (response.status === "success" && response.token && response.sessionId) {
        this.setCookie("t_auth", response.sessionId);
        localStorage.setItem("t_auth", response.token);
        if (isSuper) {
          this.setCookie("t_auth_super", response.sessionId);
          localStorage.setItem("t_auth_super", response.token);
        }
      }
      callback(response);
    });
  }

  public validate(token: string, callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "validate", data: { token } });
    this.socket.on("account:result", (response) => {
      callback(response);
    });
  }

  public getAccount(callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "getAccount", data: this.getToken() });
    this.socket.on("account:result", (response) => {
      callback(response);
    });
  }

  public getSession(callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "getSession", data: this.getToken() });
    this.socket.on("account:result", (response) => {
      callback(response);
    });
  }

  public getSessions(callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "getSessions", data: this.getToken() });
    this.socket.on("account:result", (response) => {
      callback(response);
    });
  }

  public killSession(callback: (data: any) => void, sessionId?: string): void {
    //if there is no sessionId, it will kill the current session
    this.socket.emit("account:action", { action: "killSession", data: { token: this.getToken(), sessionId } });
    this.socket.on("account:result", (response) => {
        callback(response);
    });
  }

  public killSessions(callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "killSessions", data: this.getToken() });
    this.socket.on("account:result", (response) => {
        callback(response);
    });
  }

  public getlabels(callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "getlabels", data: this.getToken() });
    this.socket.on("account:result", (response) => {
        callback(response);
    });
  }

  public setlabels(labels: any, callback: (data: any) => void): void {
    this.socket.emit("account:action", { action: "setlabels", data: { token: this.getToken(), labels } });
    this.socket.on("account:result", (response) => {
        callback(response);
    });
  }

    public getPreferences(callback: (data: any) => void): void {
        this.socket.emit("account:action", { action: "getPreferences", data: this.getToken() });
        this.socket.on("account:result", (response) => {
            callback(response);
        });
    }

    public setPreferences(preferences: any, callback: (data: any) => void): void {
        this.socket.emit("account:action", { action: "setPreferences", data: { token: this.getToken(), preferences } });
        this.socket.on("account:result", (response) => {
            callback(response);
        });
    }

}