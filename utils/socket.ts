// utils/socket.ts
import { io, Socket } from "socket.io-client";
import bcrypt from "bcryptjs";

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

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
  public publicVapidKey: string;

  constructor(url: string = "https://52ee-2a02-ab88-6787-1c80-ad15-e8c9-606e-3d76.ngrok-free.app") {
    this.socket = io(url);
    this.publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC!;
    if (!this.publicVapidKey) {
      throw new Error("Public Vapid Key is not set");
    }
  }

  urlBase64ToUint8Array(base64String: string) {
    console.log("Converting base64 to Uint8Array...", base64String);
    if (!base64String) throw new Error('Invalid base64 string');
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  public async subscribeToNotification(userId: string) {
    if (!userId) {
      console.log('Error: User ID is required');
      throw new Error('User ID is required');
    };
  
    // Service Worker ellenőrzése
    if (!('serviceWorker' in navigator)) {
      console.log('Error: ServiceWorker is not supported in this environment');
      throw new Error('ServiceWorker is not supported in this environment');
    }
  
    // További ellenőrzés és logika
    if (!('PushManager' in window)) {
      console.log('Error: PushManager is not supported in this environment');
      throw new Error('PushManager is not supported in this environment');
    }
  
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Error: Notification permission denied');
        throw new Error('Notification permission denied');
      }
  
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully');
  
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicVapidKey),
      });
  
      this.socket.emit('subscribe:not', { userId, subscription });
      alert(`User ${userId} subscribed to push notifications`);
    } catch (error: any) {
      alert(`Subscription failed: ${error.message}`);
      throw error;
    }
  }

  public async unsubscribeFromNotification(userId: string): Promise<void> {
    if (!userId) throw new Error('User ID is required');

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      this.socket.emit('unsubscribe:not', { userId, subscription });
      console.log(`User ${userId} unsubscribed from push notifications`);
    }
  }

  public sendNotification(userId: string, notificationBody: { title: string; message: string }): void {
    if (!notificationBody || typeof notificationBody !== 'object') {
      throw new Error('Notification body must be a valid object');
    }
    this.socket.emit('sendNotification', { userId, notification: notificationBody });
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
      if (response.status === "success" && response.token && response.sessionId) {
        document.cookie = `t_auth=${response.sessionId} ; path=/`;
        localStorage.setItem("t_auth", response.token);
      }
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
      if (response.status === "success" && response.token && response.sessionId) {
        document.cookie = `t_auth=${response.sessionId} ; path=/`;
        localStorage.setItem("t_auth", response.token);
      }
      callback(response); // Hibák esetén is továbbítjuk a választ
    });
    return this;
  }

  public account(): {
    get: (callback: (data: any) => void) => Client;
    getSession: (callback: (data: any) => void) => Client;
    getSessions: (callback: (data: any) => void) => Client;
    setSession: (sessionData: string, callback: (data: any) => void) => Client;
    killSession: ( callback: (data: any) => void) => Client;
    killSessions: (callback: (data: any) => void) => Client;
    changeSession: (newSessionData: any, callback: (data: any) => void) => Client;} {
    this.initialize();

    function getCookie(cname: string) {
      let name = cname + "=";
      let decodedCookie = decodeURIComponent(document.cookie);
      let ca = decodedCookie.split(';');
      for(let i = 0; i <ca.length; i++) {
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
        const session = getCookie("t_auth");
        this.socket.emit("account:action", { action: "getSession", token, session });
        this.socket.on("account:session", (response) => {
          console.log("Get session response:", response);
          callback(response);
        });
        return this;
      },
      getSessions: (callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("account:action", { action: "getSessions", token });
        this.socket.on("account:session", (response) => {
          console.log("Get session response:", response);
          callback(response);
        });
        return this;
      },
      setSession: (sessionData: string, callback: (data: any) => void): Client => {
        const session = getCookie("t_auth");
        this.socket.emit("account:action", { action: "setSessions", session, data: sessionData });
        this.socket.on("account:result", (response) => {
          console.log("Set session response:", response);
          callback(response);
        });
        return this;
      },
      killSession: (callback: (data: any) => void): Client => {
        //get the session id from the cookies
        const token = localStorage.getItem("t_auth");
        const session = getCookie("t_auth");
        this.socket.emit("account:action", { action: "killSession", token, session });
        this.socket.on("account:result", (response) => {
          console.log("Kill session response:", response);
          if (response.status === "success") {
            document.cookie = "t_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.removeItem("t_auth");
          }
          callback(response);
        });
        return this;
      },
      killSessions: (callback: (data: any) => void): Client => {
        //get the session id from the cookies
        const session = getCookie("t_auth");
        this.socket.emit("account:action", { action: "killSessions", session });
        this.socket.on("account:result", (response) => {
          console.log("Kill session response:", response);
          if (response.status === "success") {
            document.cookie = "t_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.removeItem("t_auth");
          }
          callback(response);
        });
        return this;
      },
      changeSession: (newSessionData: any, callback: (data: any) => void): Client => {
        const session = getCookie("t_auth");
        this.socket.emit("account:action", { action: "changeSession", session, data: newSessionData });
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
    getUser: (userId: string, callback: (data: any) => void) => Client; 
    getUsers: (userIds: string[], callback: (data: any) => void) => Client;
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
      getUser: (userId: string, callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("users:action", { action: "getUser", token, userId });
        this.socket.on("users:get-user", (response) => {
          console.log("Get user response:", response);
          callback(response);
        });
        return this;
      },
      getUsers: (userIds: string[], callback: (data: any) => void): Client => {
        const token = localStorage.getItem("t_auth");
        this.socket.emit("users:action", { action: "getUsers", token, userIds });
        this.socket.on("users:get-users", (response) => {
          console.log("Get users response:", response);
          callback(response);
        });
        return this;
      },
    };
  }

  public close(): void {
    this.socket.close();
  }
  
}


