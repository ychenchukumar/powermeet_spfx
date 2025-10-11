import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createRouter } from './routes';
import { createDatabase } from './store';
import { createRealtimeHub } from './realtime';
import { startMqttOrMock } from './mqtt';

const PORT = Number(process.env.PORT || 8080);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

async function main() {
  const app = express();
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json());

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: CORS_ORIGIN } });

  const db = createDatabase(process.env.DB_PATH || `${process.cwd()}/data/energy.db`);
  const hub = createRealtimeHub(io, db);

  app.use('/api', createRouter(db, hub));

  await startMqttOrMock(hub);

  server.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal', err);
  process.exit(1);
});
