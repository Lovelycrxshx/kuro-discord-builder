import type { BotCommand } from './types.js';
import { applyCommand } from './apply.js';
import { planCommand } from './plan.js';
import { publishContentCommand } from './publishContent.js';
import { publishReleaseCommand } from './publishRelease.js';
import { releaseTemplateCommand } from './releaseTemplate.js';

export const commands: BotCommand[] = [
  planCommand,
  applyCommand,
  publishContentCommand,
  publishReleaseCommand,
  releaseTemplateCommand,
];

export const commandsByName: Record<string, BotCommand> = Object.fromEntries(
  commands.map((command) => [command.data.name, command]),
);
