// utils/socket.ts

import { io, Socket } from "socket.io-client";

export class Client {
  private socket: Socket;

  constructor(url: string = "http://localhost:3000") {
    this.socket = io(url);
  }

  // Subscribe to a channel
  public subscribe(channel: string, callback: (data: any) => void) {
    this.socket.emit("subscribe", channel);
    this.socket.on(channel, callback);
    this.socket.on(channel, (data) => {
      console.log(`received message: ${data.message}`); 
    })
    console.log(`Subscribed to channel: ${channel}, room: ${this.socket.id}`);
  }

  // Unsubscribe from a channel
  public unsubscribe(channel: string) {
    this.socket.emit("unsubscribe", channel);
    this.socket.off(channel);
    console.log(`Unsubscribed from channel: ${channel}`);
  }

  // Send a message to a channel
  public send(channel: string, message: string) {
    this.socket.emit("message", { channel, message });
    console.log(`Message sent to channel ${channel}: ${message}`);
  }

  public on(event: string, callback: (data: any) => void) {
    this.socket.on(event, callback);
    console.log(`Listening for event: ${event}`);
  }

  // Close the socket connection
  public close() {
    this.socket.close();
    console.log("Socket connection closed");
  }
}
