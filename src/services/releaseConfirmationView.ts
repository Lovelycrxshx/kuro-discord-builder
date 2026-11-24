import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { PUBLISH_CONFIRM_PHRASE } from '../content/publishContent.js';
import type { ReleaseChannelStatus } from '../content/releasePosts.js';
import type { PendingApplyRequest } from './confirmationService.js';

export const RELEASE_CONFIRM_PREFIX = 'release:confirm:';
export const RELEASE_CANCEL_PREFIX = 'release:cancel:';
export const RELEASE_MODAL_PREFIX = 'release:modal:';

export function buildReleaseConfirmationMessage(
  request: PendingApplyRequest,
  statuses: readonly ReleaseChannelStatus[],
  tag: string,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const embed = new EmbedBuilder()
    .setTitle('Publish GitHub release — owner confirmation')
    .setColor(0xf59e0b)
    .setDescription(
      `<@${request.requesterId}> requested publishing stable release \`${tag}\`. Only the **server owner** can approve. ` +
        `Press **Confirm as owner**, then type \`${PUBLISH_CONFIRM_PHRASE}\` in the dialog.`,
    )
    .addFields(
      {
        name: 'Channels',
        value:
          statuses.map((status) => `• #${status.channelName} — ${status.detail}`).join('\n').slice(0, 1024) ||
          'No target channels were resolved.',
      },
      {
        name: 'Safety',
        value:
          '• Drafts and prereleases are ignored.\n' +
          '• Only official GitHub release links/assets are used.\n' +
          '• Existing messages are never edited, deleted, or pinned; no @everyone ping.',
      },
      { name: 'Expires', value: `<t:${Math.floor(request.expiresAt / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `Request ${request.id} · preview only until confirmed` });

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${RELEASE_CONFIRM_PREFIX}${request.id}`)
      .setLabel('Confirm as owner')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${RELEASE_CANCEL_PREFIX}${request.id}`)
      .setLabel('Cancel request')
      .setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [buttons] };
}

export function buildReleaseModal(request: PendingApplyRequest): ModalBuilder {
  const input = new TextInputBuilder()
    .setCustomId('release-confirmation')
    .setLabel(`Type ${PUBLISH_CONFIRM_PHRASE} to confirm`)
    .setPlaceholder(PUBLISH_CONFIRM_PHRASE)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(PUBLISH_CONFIRM_PHRASE.length)
    .setMaxLength(PUBLISH_CONFIRM_PHRASE.length);
  return new ModalBuilder()
    .setCustomId(`${RELEASE_MODAL_PREFIX}${request.id}`)
    .setTitle('Publish Kuro release post')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
}

export function buildReleaseCancelledEmbed(request: PendingApplyRequest): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Release publish cancelled')
    .setColor(0x8b5cf6)
    .setDescription(`Request \`${request.id}\` was cancelled. Nothing was posted.`)
    .setTimestamp();
}
