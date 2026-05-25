import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  /** Opens (or returns) a Socket.io connection to WS_URL with optional JWT in handshake. */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }
    this.socket = io(environment.WS_URL, {
      // Professional approach: rely on HttpOnly cookie session.
      // Cookies are sent automatically on same-site requests; withCredentials is needed for CORS.
      withCredentials: true,
      auth: {},
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}
