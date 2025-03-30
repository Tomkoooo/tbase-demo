// socket/notification.ts
import { Socket } from "socket.io-client";
import { ClientConnection } from "../socket";

export class subscribeNotification {
  private socket: Socket;
  private client: ClientConnection;
  private publicVapidKey: string;

  constructor(socket: Socket, client: ClientConnection) {
    this.socket = socket;
    this.client = client;
    this.publicVapidKey = client.publicVapidKey;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String) throw new Error("Invalid base64 string");
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private initializeNotification(): void {
    this.socket.emit("initializeNotification", {
      dbType: this.client["dbType"],
      connectionInfo: this.client["connectionInfo"],
    });
  }

  public async subscribeToNotification(userId: string): Promise<void> {
    if (!this.client["connectionInfo"]) {
      throw new Error("Connection info must be provided before subscribing to notifications.");
    }
    this.initializeNotification();

    if (!userId) {
      console.log("Error: User ID is required");
      throw new Error("User ID is required");
    }

    if (!("serviceWorker" in navigator)) {
      console.log("Error: ServiceWorker is not supported in this environment");
      throw new Error("ServiceWorker is not supported in this environment");
    }

    if (!("PushManager" in window)) {
      console.log("Error: PushManager is not supported in this environment");
      throw new Error("PushManager is not supported in this environment");
    }

    try {
      // A Notification.requestPermission Promise-ként működik modern böngészőkben
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Error: Notification permission denied");
        throw new Error("Notification permission denied");
      }

      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("Service Worker registered successfully");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicVapidKey),
      });

      this.socket.emit("subscribe:not", { userId, subscription });
      console.log(`User ${userId} subscribed to push notifications`);
    } catch (error: any) {
      alert(`Subscription failed: ${error.message}`);
      throw error;
    }
  }

  public async unsubscribeFromNotification(userId: string): Promise<void> {
    if (!this.client["connectionInfo"]) {
      throw new Error("Connection info must be provided before unsubscribing from notifications.");
    }
    this.initializeNotification();

    if (!userId) throw new Error("User ID is required");

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      this.socket.emit("unsubscribe:not", { userId, subscription });
      console.log(`User ${userId} unsubscribed from push notifications`);
    }
  }

  public sendNotification(userId: string, notificationBody: { title: string; message: string }): void {
    if (!this.client["connectionInfo"]) {
      throw new Error("Connection info must be provided before sending notifications.");
    }
    this.initializeNotification();

    if (!notificationBody || typeof notificationBody !== "object") {
      throw new Error("Notification body must be a valid object");
    }
    this.socket.emit("sendNotification", { userId, notification: notificationBody });
  }
}