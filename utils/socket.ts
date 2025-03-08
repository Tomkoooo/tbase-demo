// utils/socket.ts
import { io, Socket } from "socket.io-client";
import bcrypt from "bcryptjs";

interface ConnectionInfo {
  url?: string;
  dbName?: string;
  user?: string;
  password?: string;
  host?: string;
  database?: string;
}

interface ActionBuilder {
  query(queryCode: string): ActionBuilder;
  setState(setter: React.Dispatch<React.SetStateAction<any[]>>): ActionBuilder;
  callback(fn: (data: any) => void): ActionBuilder;
  execute(): void; // Explicit execute a lánc végén
}

interface ListenOptions {
  usePolling?: boolean;
  pollInterval?: number;
}

export class Client {
  private socket: Socket;
  private dbType: string | null = null;
  private connectionInfo: ConnectionInfo | null = null;

  constructor(url: string = "http://localhost:3000") {
    this.socket = io(url);
  }

  public database(type: "mongodb" | "mysql"): Client {
    this.dbType = type;
    return this;
  }

  public connection(info: ConnectionInfo): Client {
    this.connectionInfo = info;
    return this;
  }

  private initialize() {
    if (!this.dbType || !this.connectionInfo) {
      throw new Error("Database type and connection info must be provided.");
    }
    this.socket.emit("initialize", {
      dbType: this.dbType,
      connectionInfo: this.connectionInfo,
    });
  }

  private closeConnection() {
    this.socket.emit("close");
  }

  public subscribe(channel: string, callback: (data: any) => void): Client {
    this.initialize();
    this.socket.emit("subscribe", channel);
    this.socket.on(channel, callback);
    return this;
  }

  public listen(channel: string, callback: (data: any) => void): Client {
    this.initialize();
    this.socket.emit("listen", channel);
    this.socket.on(channel, callback);
    return this;
  }

  public unsubscribe(channel: string): Client {
    this.socket.emit("unsubscribe", channel);
    this.socket.off(channel);
    return this;
  }

  public send(channel: string, message: string): Client {
    this.socket.emit("message", { channel, message });
    return this;
  }

  public execute(channel: string, query: string, callback: (data:any) => void): Client {
    this.socket.emit("action", { action: "execute", channel, code: query, method: "" });
    this.socket.on(`${channel}:result`, callback);
    return this;
  }

  private createActionBuilder(
    channel: string,
    method: "insert" | "delete" | "update" | "get",
    client: Client
  ): ActionBuilder {
    let code: string | undefined;
    let setState: React.Dispatch<React.SetStateAction<any[]>> | undefined;
    let callback: ((data: any) => void) | undefined;
  
    const closeConnection = () => {
      client.socket.emit("close");
      console.log("Socket connection closed");
    };
  
    const builder: ActionBuilder = {
      query(queryCode: string): ActionBuilder {
        code = queryCode;
        console.log("Query set:", queryCode);
        return this;
      },
      setState(setter: React.Dispatch<React.SetStateAction<any[]>>): ActionBuilder {
        setState = setter;
        console.log("setState set");
        return this;
      },
      callback(fn: (data: any) => void): ActionBuilder {
        callback = fn;
        console.log("Callback set");
        return this;
      },
      execute(): void {
        if (!code) {
          console.error("Query code is required but not provided");
          return;
        }
        client.initialize();
        console.log("Action executed:", { channel, method, code });
        client.socket.emit("action", {
          action: "execute",
          channel,
          method,
          code,
        });
  
        if (setState || callback) {
          client.socket.once(`${channel}:result`, (response) => {
            console.log(`${method} response:`, response);
            if (response.status === "success") {
              const res = response.result;
              if (setState) {
                switch (method) {
                  case "insert":
                    if (res.insertedId) {
                      const newItem = { _id: res.insertedId, ...res.insertedDoc };
                      setState((prev) => [...prev, newItem]);
                    }
                    break;
                  case "delete":
                    if (res.deletedCount > 0) {
                      const idMatch = res.id;
                      console.log("Deleting item with ID:", idMatch);
                      if (idMatch) {
                        setState((prev) => {
                          const newState = prev.filter(
                            (item) => item._id !== idMatch
                          );
                          console.log("New state after delete:", newState);
                          return newState;
                        });
                      }
                    }
                    break;
                  case "update":
                    if (res.updatedId && res.updatedDoc) {
                      console.log("Updating item with ID:", res.updatedId);
                      setState((prev) => {
                        const newState = prev.map((item) =>
                          item._id === res.updatedId
                            ? { ...item, ...res.updatedDoc }
                            : item
                        );
                        console.log("New state after update:", newState);
                        return newState;
                      });
                    }
                    break;
                  case "get":
                    console.log("Setting state with get result:", res);
                    setState(res || []);
                    break;
                }
              }
              if (callback) callback(response);
            } else {
              console.error(`${method} failed:`, response.message);
              if (callback) callback(response);
            }
            
          });
        }
      },
    };
    return builder;
  }

  public get(channel: string): ActionBuilder {
    return this.createActionBuilder(channel, "get", this);
  }

  public delete(channel: string): ActionBuilder {
    return this.createActionBuilder(channel, "delete", this);
  }

  public update(channel: string): ActionBuilder {
    return this.createActionBuilder(channel, "update", this);
  }

  public add(channel: string): ActionBuilder {
    console.log("Creating action builder for", channel);
    return this.createActionBuilder(channel, "insert", this);
  }

  // ACCOUNT SCOPE
  public signUp(email: string, password: string, callback: (data: any) => void): Client {
    this.initialize();
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const userData = { email, password: hashedPassword, createdAt: new Date() };

    this.socket.emit("account:action", {
      action: "signup",
      data: userData,
    });

    this.socket.on("account:result", (response) => {
      console.log("SignUp response:", response);
      document.cookie = `t_auth=${response.token}`;
      localStorage.setItem("t_auth", response.token);
      callback(response);
    });

    return this;
  }

  public signIn(email: string, password: string, callback: (data: any) => void): Client {
    this.initialize();
    this.socket.emit("account:action", {
      action: "signin",
      data: { email, password },
    });
    this.socket.on("account:result", (response) => {
      console.log("SignIn response:", response);
      if (response.status === "success" && response.token) {
        localStorage.setItem("t_auth", response.token);
      }
      callback(response); // Hibák esetén is továbbítjuk a választ
    });
    return this;
  }

  public account(): {
    get: (callback: (data: any) => void) => Client;
    getSession: (callback: (data: any) => void) => Client;
    setSession: (sessionData: any, callback: (data: any) => void) => Client;
    killSession: (callback: (data: any) => void) => Client;
    changeSession: (newSessionData: any, callback: (data: any) => void) => Client;
  } {
    this.initialize();

    return {
      get: (callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("account:action", { action: "getAccount", token });
        this.socket.on("account:get", (response) => {
          console.log("Get account response:", response);
          callback(response);
        });
        return this;
      },
      getSession: (callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("account:action", { action: "getSession", token });
        this.socket.on("account:session", (response) => {
          console.log("Get session response:", response);
          callback(response);
        });
        return this;
      },
      setSession: (sessionData: any, callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("account:action", { action: "setSession", token, data: sessionData });
        this.socket.on("account:result", (response) => {
          console.log("Set session response:", response);
          callback(response);
        });
        return this;
      },
      killSession: (callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("account:action", { action: "killSession", token });
        this.socket.on("account:result", (response) => {
          console.log("Kill session response:", response);
          if (response.status === "success") {
            localStorage.removeItem("t_auth");
          }
          callback(response);
        });
        return this;
      },
      changeSession: (newSessionData: any, callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("account:action", { action: "changeSession", token, data: newSessionData });
        this.socket.on("account:result", (response) => {
          console.log("Change session response:", response);
          callback(response);
        });
        return this;
      },
    };
  }

  public listenToAccountUpdates(callback: (data: any) => void): Client {
    this.socket.on("account:updates", (update) => {
      console.log("Account update received:", update);
      callback(update);
    });
    return this;
  }

  // USERS SCOPE
  public users(): {
    listAll: (callback: (data: any[]) => void) => Client;
    listOnline: (callback: (data: any[]) => void) => Client;
    listenOnlineUsers: (callback: (data: any[]) => void) => Client;
  } {
    this.initialize();
    return {
      listAll: (callback: (data: any[]) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("users:action", { action: "listAll", token });
        this.socket.on("users:result", (response) => {
          console.log("List all users response:", response);
          if (response.status === "success") {
            callback(response.data);
          } else {
            callback([]);
          }
        });
        return this;
      },
      listOnline: (callback: (data: any[]) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("users:action", { action: "listOnline", token });
        this.socket.on("users:online", (response) => {
          console.log("List online users response:", response);
          if (response.status === "success") {
            console.log("Online users:", response.data);
            callback(response.data);
          } else {
            callback([]);
          }
        });
        return this;
      },
      listenOnlineUsers: (callback: (data: any[]) => void): Client => {
        this.socket.emit("subscribe", "users:onlineChanged");
        this.socket.on("users:onlineChanged", (onlineUsersData) => {
          console.log("Online users changed:", onlineUsersData);
          callback(onlineUsersData); // Közvetlenül a kapott adatokat adjuk át
        });
        return this;
      },
    };
  }

  public close(): void {
    this.socket.close();
  }
  
}


