import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { logger } from '../logger.js';
import {
  buildReleaseAnnouncement,
  KURO_1_5_5_ANNOUNCEMENT,
} from '../templates/releaseAnnouncement.js';
import type { BotCommand } from './types.js';

function parseHighlights(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export const releaseTemplateCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('release-template')
    .setDescription('Preview an official Kuro TV release announcement (rich preset for 1.5.5).')
    .setContexts(InteractionContextType.Guild)
    .addStringOption((option) =>
      option.setName('version').setDescription('Release version, e.g. 1.5.5').setMaxLength(40).setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('highlights')
        .setDescription('Custom highlights; overrides the 1.5.5 preset when provided')
        .setMaxLength(800)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('checksum')
        .setDescription('SHA-256 of the signed APK (optional)')
        .setMaxLength(128)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const version = interaction.options.getString('version', true).trim();
    const customHighlights = parseHighlights(interaction.options.getString('highlights'));
    const checksum = interaction.options.getString('checksum') ?? undefined;
    const richPreset = version.replace(/^v/i, '') === '1.5.5';
    const base = richPreset ? KURO_1_5_5_ANNOUNCEMENT : { version, highlights: customHighlights };

    const announcement = buildReleaseAnnouncement({
      ...base,
      version,
      highlights: customHighlights.length > 0 ? customHighlights : base.highlights,
      checksum,
    });

    await interaction.reply({
      content:
        'Announcement preview only — nothing was posted. Copy this into #android-releases when ready ' +
        '(the channel is read-only for members, so a moderator or the owner must post it).',
      embeds: announcement.embeds,
      components: announcement.components,
      flags: MessageFlags.Ephemeral,
    });
    logger.action('command.release_template', {
      guildId: interaction.guildId ?? undefined,
      userId: interaction.user.id,
      version,
      richPreset,
    });
  },
};
