import 'dotenv/config';
import { isDiscordSnowflake, looksLikeDiscordBotToken } from './utils/configValidation.js';

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readRequired(name: string): string {
  const value = readOptional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  }
  return value;
}

const rawPort = readOptional('PORT') ?? '3000';
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT must be an integer between 1 and 65535, received: ${rawPort}`);
}

const guildId = readOptional('DISCORD_GUILD_ID');
const logChannelId = readOptional('LOG_CHANNEL_ID');

if (guildId && !isDiscordSnowflake(guildId)) {
  throw new Error('DISCORD_GUILD_ID must be a Discord snowflake (17-20 digits) or blank.');
}
if (logChannelId && !isDiscordSnowflake(logChannelId)) {
  throw new Error('LOG_CHANNEL_ID must be a Discord snowflake (17-20 digits) or blank.');
}

const token = readRequired('DISCORD_TOKEN');
if (!looksLikeDiscordBotToken(token)) {
  throw new Error(
    'DISCORD_TOKEN does not look like a Discord bot token. Replace the placeholder or rotated token, then restart.',
  );
}

const clientId = readRequired('DISCORD_CLIENT_ID');
if (!isDiscordSnowflake(clientId)) {
  throw new Error('DISCORD_CLIENT_ID must be a Discord application ID (17-20 digits).');
}

export const config = {
  token,
  clientId,
  guildId,
  logChannelId,
  port,
  actionLogPath: readOptional('ACTION_LOG_PATH') ?? 'data/actions.jsonl',
} as const;

export type Config = typeof config;
