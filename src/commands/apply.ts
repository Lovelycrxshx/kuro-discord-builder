import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { logger } from '../logger.js';
import { assertPlanIsLeastPrivilege, KURO_SERVER_PLAN } from '../plan/serverPlan.js';
import { confirmations } from '../services/confirmationService.js';
import { buildConfirmationMessage } from '../services/confirmationView.js';
import { preflightGuild } from '../services/serverBuilder.js';
import type { BotCommand } from './types.js';

export const applyCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Apply the reviewed plan. The server owner must confirm before anything is created.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName('note')
        .setDescription('Optional note recorded in the audit log')
        .setMaxLength(200)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const isOwner = interaction.user.id === guild.ownerId;
    const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
    if (!isOwner && !canManage) {
      await interaction.reply({
        content: 'You need Manage Server permission to request an apply. The server owner must still confirm it.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    assertPlanIsLeastPrivilege(KURO_SERVER_PLAN);

    // Fail before asking for confirmation if the bot cannot actually apply.
    let preflightWarnings: string[] = [];
    try {
      preflightWarnings = preflightGuild(guild);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      logger.warn('apply.preflight_failed', {
        guildId: guild.id,
        userId: interaction.user.id,
        error: detail,
      });
      await interaction.reply({
        content: `Apply cannot run yet: ${detail}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existing = confirmations.getActiveForGuild(guild.id, 'apply');
    const request =
      existing ??
      confirmations.create({
        kind: 'apply',
        guildId: guild.id,
        channelId: interaction.channelId,
        requesterId: interaction.user.id,
        note:
          [...preflightWarnings, interaction.options.getString('note')?.trim()].filter(Boolean).join('\n') ||
          undefined,
      });

    const message = buildConfirmationMessage(request, KURO_SERVER_PLAN);
    await interaction.reply({
      content: isOwner
        ? existing
          ? 'There is already a pending request. Here are its confirmation buttons again.'
          : 'Nothing has been created yet. Confirm below as the server owner.'
        : `<@${guild.ownerId}> — <@${interaction.user.id}> requested \`/apply\`. ` +
          'Only you can approve it; press the button below.',
      embeds: message.embeds,
      components: message.components,
      ...(isOwner ? { flags: MessageFlags.Ephemeral } : {}),
    });

    logger.action('apply.requested', {
      guildId: guild.id,
      userId: interaction.user.id,
      requestId: request.id,
      reusedPendingRequest: Boolean(existing),
      visibleToOwnerOnly: isOwner,
    });
  },
};
