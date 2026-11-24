import http from 'node:http';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { handleInteraction } from './interactions.js';
import { logger } from './logger.js';
import { confirmations } from './services/confirmationService.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const startedAt = Date.now();
let healthServer: http.Server | undefined;
let shuttingDown = false;

function startHealthServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const path = (request.url ?? '/').split('?')[0];
      if (path !== '/' && path !== '/health') {
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'not_found' }));
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(
        JSON.stringify({
          status: 'ok',
          uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
          guilds: client.guilds.cache.size,
          pendingApplyRequests: confirmations.size,
        }),
      );
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
  if (healthServer) {
    await new Promise<void>((resolve) => healthServer?.close(() => resolve()));
  }
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
  logger.info('bot.ready', {
    botUserId: client.user?.id,
    guilds: client.guilds.cache.size,
  });
});
client.on('error', (error) => {
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

main().catch((error: unknown) => {
  logger.error('startup.failed', { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
