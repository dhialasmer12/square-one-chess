import './types/express-augment';
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { app } from './app';
import { registerGameSockets } from './sockets/game.socket';
import { setSocketServer } from './sockets/io';

const port = Number(process.env.PORT) || 3000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

setSocketServer(io);
registerGameSockets(io);

httpServer.listen(port, () => {
  const bootId = uuidv4().slice(0, 8);
  console.log(`HTTP + Socket.io listening on :${port} (boot ${bootId})`);
});
