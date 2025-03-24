// database.ts
import { Channels, DatabaseResponse } from "./channel";
import { Socket } from "socket.io-client";
import { ClientConnection as Client } from "../socket";

interface ActionBuilder {
  [x: string]: any;
  query(queryCode: string): ActionBuilder;
  setState(setter: React.Dispatch<React.SetStateAction<any[]>>): ActionBuilder;
  callback(fn: (data: DatabaseResponse) => void): ActionBuilder;
  execute(): void;
}

export class Database {
  private socket: Socket;
  private client: Client;

  constructor(socket: Socket, client: Client) {
    this.socket = socket;
    this.client = client;
  }

  private createActionBuilder(channel: string, method: "insert" | "delete" | "update" | "get"): ActionBuilder {
    let query: string | undefined;
    let setState: React.Dispatch<React.SetStateAction<any[]>> | undefined;
    let callback: ((data: DatabaseResponse) => void) | undefined;

    // Lokális referencia a socket-re, hogy ne veszítsük el a kontextust
    const socket = this.socket;

    const builder: ActionBuilder = {
      query(queryCode: string): ActionBuilder {
        query = queryCode;
        return this;
      },
      setState(setter: React.Dispatch<React.SetStateAction<any[]>>): ActionBuilder {
        setState = setter;
        return this;
      },
      callback(fn: (data: DatabaseResponse) => void): ActionBuilder {
        callback = fn;
        return this;
      },
      execute(): void {
        if (!query) {
          console.error("Query is required but not provided");
          return;
        }
        // A lokális socket változót használjuk
        socket.emit("db:action", { channel, query, method });
        socket.once(`${channel}:result`, (response: DatabaseResponse) => {
          if (response.status === "success" && setState) {
            switch (method) {
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
          if (callback) callback(response);
        });
      },
    };
    return builder;
  }

  public get(channel: string): ActionBuilder {
    return this.createActionBuilder(channel, "get");
  }

  public delete(channel: string): ActionBuilder {
    return this.createActionBuilder(channel, "delete");
  }

  public update(channel: string): ActionBuilder {
    return this.createActionBuilder(channel, "update");
  }

  public insert(channel: string): ActionBuilder {
    return this.createActionBuilder(channel, "insert");
  }
}