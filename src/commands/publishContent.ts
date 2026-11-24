import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { buildPublishPreview } from '../content/publishContent.js';
import { logger } from '../logger.js';
import { resolveContentTargets } from '../services/contentPublisher.js';
import { confirmations } from '../services/confirmationService.js';
import {
  buildPublishConfirmationMessage,
} from '../services/publishConfirmationView.js';
import type { BotCommand } from './types.js';

export const publishContentCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('publish-content')
    .setDescription('Preview and publish the standard Kuro TV messages with owner confirmation.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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
        content: 'You need Manage Server permission to request publishing. The server owner must still confirm.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targets = await resolveContentTargets(guild);
    const statuses = targets.map((target) => target.status);
    const preview = buildPublishPreview(statuses);

    const existing = confirmations.getActiveForGuild(guild.id, 'publish');
    const request =
      existing ??
      confirmations.create({
        kind: 'publish',
        guildId: guild.id,
        channelId: interaction.channelId,
        requesterId: interaction.user.id,
        note: 'Kuro TV standard content publish',
      });
    const confirmation = buildPublishConfirmationMessage(request, statuses);

    await interaction.reply({
      content: isOwner
        ? 'Preview only. No messages have been posted; confirm below to publish.'
        : `<@${guild.ownerId}> — <@${interaction.user.id}> requested content publishing. Only you can approve it.`,
      embeds: [...preview.embeds, ...confirmation.embeds],
      components: confirmation.components,
      files: preview.files,
      ...(isOwner ? { flags: MessageFlags.Ephemeral } : {}),
    });

    logger.action('publish.requested', {
      guildId: guild.id,
      userId: interaction.user.id,
      requestId: request.id,
      reusedPendingRequest: Boolean(existing),
      readyTargets: statuses.filter((status) => status.state === 'ready').length,
    });
  },
};
