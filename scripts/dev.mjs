import { spawn } from 'child_process';
import net from 'net';
import path from 'path';

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitPort(port, host = '127.0.0.1', retries = 30) {
  for (let i = 0; i < retries; i++) {
    const open = await checkPort(port, host);
    if (open) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function main() {
  console.log('🚀 [Atendia] Iniciando entorno de desarrollo...');

  const pgPort = parseInt(process.env.PGPORT || '5432', 10);
  let dbProcess = null;

  const isDbRunning = await checkPort(pgPort);
  if (isDbRunning) {
    console.log(`✓ [Base de Datos] Detectado PostgreSQL en puerto ${pgPort}.`);
  } else {
    console.log(`⚡ [Base de Datos] Arrancando PostgreSQL local embebido (PGlite) en puerto ${pgPort}...`);
    dbProcess = spawn('node', ['scripts/db-server.mjs'], {
      stdio: 'inherit',
      shell: true,
    });

    const ready = await waitPort(pgPort);
    if (!ready) {
      console.error('❌ Error: No se pudo conectar al servidor PostgreSQL embebido.');
      process.exit(1);
    }
  }

  // Ejecución de concurrencia para Web y Worker
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  console.log('🌐 [Atendia] Arrancando Servidor Web (Next.js) y Worker de fondo...');
  const appProcess = spawn(
    'npx',
    [
      'concurrently',
      '--kill-others',
      '--prefix',
      'name',
      '--names',
      'WEB,WORKER',
      '--prefix-colors',
      'cyan.bold,magenta.bold',
      `"${npmCmd} run dev:web"`,
      `"${npmCmd} run dev:worker"`,
    ],
    {
      stdio: 'inherit',
      shell: true,
    }
  );

  const cleanup = () => {
    console.log('\n🛑 [Atendia] Deteniendo servicios...');
    if (appProcess) appProcess.kill();
    if (dbProcess) dbProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

