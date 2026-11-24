import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { logger } from '../logger.js';
import { assertPlanIsLeastPrivilege, KURO_SERVER_PLAN } from '../plan/serverPlan.js';
import { buildPlanReply } from '../plan/planView.js';
import type { BotCommand } from './types.js';

export const planCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('plan')
    .setDescription('Preview the Kuro TV categories, channels, roles, and permissions (no changes).')
    .setContexts(InteractionContextType.Guild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    assertPlanIsLeastPrivilege(KURO_SERVER_PLAN);
    const { embeds, files } = buildPlanReply(KURO_SERVER_PLAN);
    await interaction.reply({
      content: 'Preview only — this command never changes the server.',
      embeds,
      files,
      flags: MessageFlags.Ephemeral,
    });
    logger.action('command.plan', {
      guildId: interaction.guildId ?? undefined,
      userId: interaction.user.id,
      planId: KURO_SERVER_PLAN.id,
      planVersion: KURO_SERVER_PLAN.version,
    });
  },
};
