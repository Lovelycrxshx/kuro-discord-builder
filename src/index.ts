import http from 'node:http';
import { ChannelType, Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { buildWelcomeMessage } from './content/joinWelcomes.js';
import { handleInteraction } from './interactions.js';
import { logger } from './logger.js';
import { confirmations } from './services/confirmationService.js';
import { ReleaseMonitor } from './services/releasePosts.js';

// Server Members is required for join welcomes. Message Content and Presence stay disabled.
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const releaseMonitor = new ReleaseMonitor(client);
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

client.on('guildMemberAdd', async (member) => {
  try {
    const channel = member.guild.channels.cache.find(
      (candidate) =>
        candidate.type === ChannelType.GuildText && candidate.name.toLowerCase() === 'welcome',
    );
    if (!channel || !('send' in channel)) {
      logger.warn('welcome.channel_missing', { guildId: member.guild.id, userId: member.id });
      return;
    }
    const me = member.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(['ViewChannel', 'SendMessages'])) {
      logger.warn('welcome.bot_no_access', { guildId: member.guild.id, userId: member.id });
      return;
    }

    const welcome = buildWelcomeMessage(member.id, config.welcomeMentionUserId);
    await channel.send({
      content: welcome.content,
      allowedMentions: { parse: [], users: welcome.mentionIds, repliedUser: false },
    });
    logger.action('welcome.sent', {
      guildId: member.guild.id,
      userId: member.id,
      channelId: channel.id,
      specialMention: Boolean(config.welcomeMentionUserId),
    });
  } catch (error) {
    logger.error('welcome.failed', {
      guildId: member.guild.id,
      userId: member.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

async function main(): Promise<void> {
  await startHealthServer();
  logger.info('health_server.listening', { port: config.port, path: '/health' });
  await client.login(config.token);

  await releaseMonitor.start();
  // First poll only establishes the baseline when no state exists; it never auto-posts an old release.
  await releaseMonitor.poll();

  const interval = setInterval(() => {
    const removed = confirmations.prune();
    if (removed > 0) logger.debug('confirmations.pruned', { removed });
  }, 60_000);
  interval.unref();

  const releaseInterval = setInterval(() => {
    void releaseMonitor.poll();
  }, config.releasePollIntervalMs);
  releaseInterval.unref();
}

main().catch(async (error: unknown) => {
  logger.error('startup.failed', { error: error instanceof Error ? error.message : String(error) });
  client.destroy();
  await closeHealthServer();
  // Exit non-zero so Railway restarts/reports failure instead of serving a false-healthy port.
  process.exit(1);
});
