import 'socket.io';

declare module 'socket.io' {
  interface SocketData {
    userId: string;
    activeGameId?: string;
    activeColor?: 'white' | 'black';
  }
}

export {};
