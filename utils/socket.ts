// utils/socket.ts
import { parse } from "path";
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

 // utils/socket.ts (részlet)
public action(
  channel: string,
  method: "insert" | "delete" | "update" | "get",
  code: string,
  callback?: (data: any) => void,
  setState?: React.Dispatch<React.SetStateAction<any[]>>,

): Client {
  this.initialize();
  this.socket.emit("action", { action: "execute", channel, method, code });

  if (setState || callback) {
    console.log("Setting up listener for", channel);
    this.socket.on(`${channel}:result`, (response) => {
      console.log("Action response:", response);
      if (response.status === "success") {
        console.log(setState);
        if (setState) {
          const res = response.result
          switch (method) {
            case "insert":
              console.log("Inserting new item:", res);
              // MongoDB: insertedId + objektum, MySQL: insertId + új rekord
              if (res.insertedId || res.insertId) {
                console.log("Inserting new item:", res);
                const newItem = res.insertedId
                  ? { _id: res.insertedId } // MongoDB
                  : { id: res.insertId, ...res }; // MySQL
                setState((prev) => [...prev, newItem]);
              }
              break;

            case "delete":
              // MongoDB: deletedId, MySQL: affectedRows vagy id a kódból
              console.log("Deleting item:", res, response.result, response.result);
              if (res.deletedCount > 0) {
                const idToDelete = res.id? res.id : code.match(/id = (\d+)/)?.[1];
                setState((prev) =>
                  prev.filter((item) =>
                     item._id !== idToDelete
                  )
                );
              }
              break;

            case "update":
              // MongoDB: updatedId + updatedDoc, MySQL: affectedRows + új rekord
              if (res.updatedId && res.updatedDoc) {
                // MongoDB
                setState((prev) =>
                  prev.map((item) => (item._id === res.updatedId ? res.updatedDoc : item))
                );
              } else if (res.affectedRows) {
                // MySQL: feltételezzük, hogy a code tartalmazza az id-t és az új értékeket
                const idMatch = code.match(/id = (\d+)/)?.[1];
                const updatedFields = code.match(/SET (.+?) WHERE/)?.[1]?.split(", ").reduce((acc, pair) => {
                  const [key, value] = pair.split(" = ");
                  acc[key] = value.replace(/['"]/g, "");
                  return acc;
                }, {} as any);
                if (idMatch && updatedFields) {
                  setState((prev) =>
                    prev.map((item) =>
                      item.id === Number(idMatch) ? { ...item, ...updatedFields } : item
                    )
                  );
                }
              }
              break;

            case "get":
              // MongoDB: dokumentumok tömbje, MySQL: sorok tömbje
              console.log("Setting state with", res);
              setState(Array.isArray(res) ? res : [res]); // Biztosítjuk, hogy tömb legyen
              break;

            default:
              console.warn("Unknown method:", method);
          }
        }
        if (callback) callback(response);
      } else {
        console.error("Action failed:", response.error);
        if (callback) callback(response);
      }
    });
  }

  return this;
}

  public close(): void {
    this.socket.close();
  }
}