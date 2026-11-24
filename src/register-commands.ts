import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';
import { config } from './config.js';
import { logger } from './logger.js';

async function main(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const body = commands.map((command) => command.data.toJSON());
  const scope = config.guildId ? { guildId: config.guildId } : { global: true };
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body });
  logger.info('commands.registered', {
    ...scope,
    count: body.length,
    names: commands.map((command) => command.data.name),
  });
}

main().catch((error: unknown) => {
  logger.error('commands.registration_failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
