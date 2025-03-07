// utils/socket.ts
import { io, Socket } from "socket.io-client";

interface ConnectionInfo {
  url?: string;
  dbName?: string;
  user?: string;
  password?: string;
  host?: string;
  database?: string;
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

  public action(channel: string, method: string, callback?: (data: any) => void): Client {
    this.initialize();
    this.socket.emit("action", { action: "execute", channel, method });
    if (callback) {
      this.socket.on(`${channel}:result`, callback);
    }
    return this;
  }

  public close(): void {
    this.socket.close();
  }
}