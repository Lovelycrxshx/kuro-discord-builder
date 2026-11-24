import 'dotenv/config';

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

const snowflakePattern = /^\d{17,20}$/;
const guildId = readOptional('DISCORD_GUILD_ID');
const logChannelId = readOptional('LOG_CHANNEL_ID');

if (guildId && !snowflakePattern.test(guildId)) {
  throw new Error('DISCORD_GUILD_ID must be a Discord snowflake (17-20 digits) or blank.');
}
if (logChannelId && !snowflakePattern.test(logChannelId)) {
  throw new Error('LOG_CHANNEL_ID must be a Discord snowflake (17-20 digits) or blank.');
}

export const config = {
  token: readRequired('DISCORD_TOKEN'),
  clientId: readRequired('DISCORD_CLIENT_ID'),
  guildId,
  logChannelId,
  port,
  actionLogPath: readOptional('ACTION_LOG_PATH') ?? 'data/actions.jsonl',
} as const;

export type Config = typeof config;
