// channels.ts
import { Socket } from "socket.io-client";
import { ClientConnection as Client } from "../socket";

export interface DatabaseResponse {
  status: "success" | "error";
  method?: "insert" | "delete" | "update" | "get";
  result?: any;
  error?: string;
}

export class Channels {
  private socket: Socket;
  private client: Client;

  constructor(socket: Socket, client: Client) {
    this.socket = socket;
    this.client = client;
  }

  public subscribe(channel: string, callback: (data: any) => void): Client {
    this.socket.emit("subscribe", channel);
    this.socket.on(channel, callback);
    return this.client;
  }

  public listen(channel: string, callback: (data: any) => void): Client {
    this.socket.emit("listen", channel);
    this.socket.on(channel, callback);
    return this.client;
  }

  public unsubscribe(channel: string): Client {
    this.socket.emit("unsubscribe", channel);
    this.socket.off(channel);
    return this.client;
  }

  public send(channel: string, data: any): Client {
    this.socket.emit("message", { channel, data });
    return this.client;
  }

  public databaseListen(
    channel: string,
    callback: (data: DatabaseResponse) => void,
    setState?: React.Dispatch<React.SetStateAction<any[]>>
  ): Client {
    this.socket.emit("db:listen", channel);
    this.socket.on(`${channel}:change`, (response: DatabaseResponse) => {
      if (response.status === "success" && setState) {
        switch (response.method) {
          case "insert":
            if (response.result?.insertedId) {
              setState((prev) => [...prev, { _id: response.result.insertedId, ...response.result.insertedDoc }]);
            }
            break;
          case "delete":
            if (response.result?.deletedCount > 0) {
              setState((prev) => prev.filter((item) => item._id !== response.result.id));
            }
            break;
          case "update":
            if (response.result?.updatedId) {
              setState((prev) =>
                prev.map((item) =>
                  item._id === response.result.updatedId ? { ...item, ...response.result.updatedDoc } : item
                )
              );
            }
            break;
          case "get":
            setState(response.result || []);
            break;
        }
      }
      callback(response);
    });
    return this.client;
  }
}