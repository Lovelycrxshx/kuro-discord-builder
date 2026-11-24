import {
  AttachmentBuilder,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { buildReleasePosts } from '../content/releasePosts.js';
import { logger } from '../logger.js';
import { confirmations } from '../services/confirmationService.js';
import { buildReleaseConfirmationMessage } from '../services/releaseConfirmationView.js';
import {
  fetchLatestStableRelease,
  getReleaseChannelStatus,
} from '../services/releasePosts.js';
import type { BotCommand } from './types.js';

export const publishReleaseCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('publish-release')
    .setDescription('Preview the latest stable GitHub release post, then publish with owner confirmation.')
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
        content: 'You need Manage Server permission to request a release post. The server owner must still confirm.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let release;
    try {
      release = await fetchLatestStableRelease();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await interaction.reply({ content: `Could not fetch GitHub releases: ${detail}`, flags: MessageFlags.Ephemeral });
      return;
    }
    if (!release) {
      await interaction.reply({ content: 'No stable, non-draft Kuro TV release was found.', flags: MessageFlags.Ephemeral });
      return;
    }

    const posts = buildReleasePosts(release);
    const statuses = posts.map((post) => getReleaseChannelStatus(guild, post.channelName));
    const previewEmbeds = posts.map((post, index) =>
      new EmbedBuilder()
        .setTitle(`Preview · #${post.channelName}`)
        .setColor(0x8b5cf6)
        .setDescription(post.content.slice(0, 1200))
        .addFields(
          { name: 'Channel status', value: statuses[index]?.detail ?? 'not checked' },
          { name: 'Idempotency marker', value: `\`${post.marker}\`` },
        )
        .setFooter({ text: 'Preview only — nothing has been posted' }),
    );

    const markdown = posts.map((post) => `# #${post.channelName}\n\n${post.content}\n`).join('\n---\n');
    const file = new AttachmentBuilder(Buffer.from(markdown, 'utf8'), {
      name: 'kuro-release-preview.md',
      description: 'Full Kuro TV release post preview',
    });

    const existing = confirmations.getActiveForGuild(guild.id, 'release');
    const request =
      existing ??
      confirmations.create({
        kind: 'release',
        guildId: guild.id,
        channelId: interaction.channelId,
        requesterId: interaction.user.id,
        note: `Stable release ${release.tag_name}`,
      });
    const confirmation = buildReleaseConfirmationMessage(request, statuses, release.tag_name);

    await interaction.reply({
      content: isOwner
        ? `Preview of stable release \`${release.tag_name}\`. Nothing has been posted; confirm below to publish.`
        : `<@${guild.ownerId}> — <@${interaction.user.id}> requested release posts for \`${release.tag_name}\`. Only you can approve.`,
      embeds: [...previewEmbeds, ...confirmation.embeds],
      components: confirmation.components,
      files: [file],
      ...(isOwner ? { flags: MessageFlags.Ephemeral } : {}),
    });

    logger.action('release_preview.requested', {
      guildId: guild.id,
      userId: interaction.user.id,
      requestId: request.id,
      tag: release.tag_name,
    });
  },
};
