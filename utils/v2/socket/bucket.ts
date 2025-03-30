// socket/bucket.ts
import { Socket } from "socket.io-client";
import { ClientConnection } from "../socket";

export class Bucket {
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

  public async createBucket(): Promise<string> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "create", token });

      this.socket.once("bucket:created", ({ bucketId }: { bucketId: string }) => {
        console.log(`Bucket created: ${bucketId}`);
        resolve(bucketId);
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error creating bucket: ${message}`);
        reject(new Error(message));
      });
    });
  }

  public async uploadFile(bucketId: string, file: { name: string; type: string; data: ArrayBuffer }): Promise<string> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    if (!bucketId || !file || !file.name || !file.type || !file.data) {
      console.log("Uploading file to bucket:", bucketId, file);
      console.log("Error: Bucket ID and file details (name, type, data) are required");
      throw new Error("Bucket ID and file details are required");
    }

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "upload", bucketId, file, token });

      this.socket.once("file:uploaded", ({ bucketId: returnedBucketId, fileId }: { bucketId: string; fileId: string }) => {
        console.log(`File uploaded to ${returnedBucketId}: ${fileId}`);
        resolve(fileId);
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error uploading file: ${message}`);
        reject(new Error(message));
      });
    });
  }

  public async getFile(bucketId: string, fileId: string): Promise<{ fileName: string; fileType: string; fileData: ArrayBuffer }> {
    this.initializeIfNeeded();
    if (!bucketId || !fileId) {
      console.log("Error: Bucket ID and file ID are required");
      throw new Error("Bucket ID and file ID are required");
    }

    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "get", bucketId, fileId, token });

      this.socket.once("file:retrieved", (retrievedFile: { fileName: string; fileType: string; fileData: ArrayBuffer }) => {
        console.log(`File retrieved from ${bucketId}: ${retrievedFile.fileName}`);
        resolve(retrievedFile);
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error retrieving file: ${message}`);
        reject(new Error(message));
      });
    });
  }

  public async listFiles(bucketId: string): Promise<{ id: string; fileName: string; fileType: string; createdAt: string; updatedAt: string }[]> {
    this.initializeIfNeeded();
    if (!bucketId) {
      console.log("Error: Bucket ID is required");
      throw new Error("Bucket ID is required");
    }

    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "list", bucketId, token });

      this.socket.once("file:listed", ({ bucketId: returnedBucketId, files }: { bucketId: string; files: any[] }) => {
        console.log(`Listed ${files.length} files in ${returnedBucketId}`);
        resolve(files);
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error listing files: ${message}`);
        reject(new Error(message));
      });
    });
  }

  public async deleteFile(bucketId: string, fileId: string): Promise<void> {
    this.initializeIfNeeded();
    if (!bucketId || !fileId) {
      console.log("Error: Bucket ID and file ID are required");
      throw new Error("Bucket ID and file ID are required");
    }

    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "deleteFile", bucketId, fileId, token });

      this.socket.once("file:delete", ({ bucketId: returnedBucketId, fileId: deletedFileId }: { bucketId: string; fileId: string }) => {
        console.log(`File ${deletedFileId} deleted from ${returnedBucketId}`);
        resolve();
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error deleting file: ${message}`);
        reject(new Error(message));
      });
    });
  }

  public async listBuckets(): Promise<string[]> {
    this.initializeIfNeeded();
    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "bucketList", token });

      this.socket.once("bucket:listed", ({ buckets }: { buckets: string[] }) => {
        console.log(`Listed ${buckets.length} buckets`);
        resolve(buckets);
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error listing buckets: ${message}`);
        reject(new Error(message));
      });
    });
  }

  public async deleteBucket(bucketId: string): Promise<void> {
    this.initializeIfNeeded();
    if (!bucketId) {
      console.log("Error: Bucket ID is required");
      throw new Error("Bucket ID is required");
    }

    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "delete", bucketId, token });

      this.socket.once("bucket:deleted", ({ bucketId: deletedBucketId }: { bucketId: string }) => {
        console.log(`Bucket ${deletedBucketId} deleted`);
        resolve();
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error deleting bucket: ${message}`);
        reject(new Error(message));
      });
    });
  }

  public async renameBucket(oldBucketId: string, newBucketId: string): Promise<void> {
    this.initializeIfNeeded();
    if (!oldBucketId || !newBucketId) {
      console.log("Error: Old and new bucket IDs are required");
      throw new Error("Old and new bucket IDs are required");
    }

    const token = localStorage.getItem("t_auth");

    return new Promise((resolve, reject) => {
      this.socket.emit("bucket:action", { action: "rename", bucketId: oldBucketId, newBucketId, token });

      this.socket.once("bucket:renamed", ({ oldBucketId: oldId, newBucketId: newId }: { oldBucketId: string; newBucketId: string }) => {
        console.log(`Bucket renamed from ${oldId} to ${newId}`);
        resolve();
      });

      this.socket.once("error", ({ message }: { message: string }) => {
        console.log(`Error renaming bucket: ${message}`);
        reject(new Error(message));
      });
    });
  }
}