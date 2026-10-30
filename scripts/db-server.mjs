import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.PGDATA_DIR || path.resolve(process.cwd(), 'data/pgdata');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const port = parseInt(process.env.PGPORT || '5432', 10);
const host = process.env.PGHOST || '127.0.0.1';

console.log(`[PGlite Server] Inicializando almacenamiento en ${dataDir}...`);
const db = new PGlite(dataDir);

const server = new PGLiteSocketServer({
  db,
  port,
  host,
  maxConnections: 100,
});

server.start().then(() => {
  console.log(`[PGlite Server] Base de datos PostgreSQL activa y escuchando en ${host}:${port}`);
}).catch((err) => {
  console.error('[PGlite Server] Error al iniciar:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n[PGlite Server] Cerrando...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

