import http from 'node:http';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { handleInteraction } from './interactions.js';
import { logger } from './logger.js';
import { confirmations } from './services/confirmationService.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const startedAt = Date.now();
let healthServer: http.Server | undefined;
let readySince: number | undefined;
let shuttingDown = false;

async function closeHealthServer(): Promise<void> {
  const server = healthServer;
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  healthServer = undefined;
}

function startHealthServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const path = (request.url ?? '/').split('?')[0];
      if (path !== '/' && path !== '/health') {
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'not_found' }));
        return;
      }

      // Fail closed: a live HTTP port does not mean the Discord gateway is connected.
      const ready = client.isReady() && readySince !== undefined;
      const body = {
        status: ready ? 'ok' : 'starting',
        ready,
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        readySeconds: readySince ? Math.floor((Date.now() - readySince) / 1000) : 0,
        guilds: client.guilds.cache.size,
        pendingApplyRequests: confirmations.size,
      };
      response.writeHead(ready ? 200 : 503, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      });
      response.end(JSON.stringify(body));
    });
    server.once('error', reject);
    server.listen(config.port, '0.0.0.0', () => {
      healthServer = server;
      resolve();
    });
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutdown.started', { signal });
  client.destroy();
  await closeHealthServer();
  logger.info('shutdown.complete', { signal });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  logger.error('process.unhandled_rejection', { error: error instanceof Error ? error.message : String(error) });
});
process.on('uncaughtException', (error) => {
  logger.error('process.uncaught_exception', { error: error instanceof Error ? error.message : String(error) });
});

client.on('interactionCreate', (interaction) => {
  void handleInteraction(interaction);
});
client.once('ready', () => {
  readySince = Date.now();
  logger.info('bot.ready', {
    botUserId: client.user?.id,
    guilds: client.guilds.cache.size,
  });
});
client.on('error', (error) => {
  readySince = undefined;
  logger.error('gateway.error', { error: error.message });
});

async function main(): Promise<void> {
  await startHealthServer();
  logger.info('health_server.listening', { port: config.port, path: '/health' });
  await client.login(config.token);

  const interval = setInterval(() => {
    const removed = confirmations.prune();
    if (removed > 0) logger.debug('confirmations.pruned', { removed });
  }, 60_000);
  interval.unref();
}

main().catch(async (error: unknown) => {
  logger.error('startup.failed', { error: error instanceof Error ? error.message : String(error) });
  client.destroy();
  await closeHealthServer();
  // Exit non-zero so Railway restarts/reports failure instead of serving a false-healthy port.
  process.exit(1);
});
