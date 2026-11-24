import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { ContentTargetStatus } from '../content/publishContent.js';
import { PUBLISH_CONFIRM_PHRASE } from '../content/publishContent.js';
import type { PendingApplyRequest } from './confirmationService.js';

export const PUBLISH_CONFIRM_PREFIX = 'publish:confirm:';
export const PUBLISH_CANCEL_PREFIX = 'publish:cancel:';
export const PUBLISH_MODAL_PREFIX = 'publish:modal:';

export function buildPublishConfirmationMessage(
  request: PendingApplyRequest,
  statuses: readonly ContentTargetStatus[],
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const targetLines = statuses.map((status) => {
    const icon = status.state === 'ready' ? '✅' : '⚠️';
    return `${icon} #${status.channelName} — ${status.detail}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Publish Kuro TV content — owner confirmation')
    .setColor(0xf59e0b)
    .setDescription(
      `<@${request.requesterId}> requested content publishing. Only the **server owner** can approve it. ` +
        `Press **Confirm as owner**, then type \`${PUBLISH_CONFIRM_PHRASE}\` in the dialog.`,
    )
    .addFields(
      {
        name: 'Channels',
        value: targetLines.join('\n').slice(0, 1024) || 'No target channels were resolved.',
      },
      {
        name: 'Safety',
        value: [
          '• Posts only new, marked messages; existing posts are never edited or deleted.',
          '• Missing channels are skipped and reported.',
          '• No mass mentions, no permission changes, no pinning.',
        ].join('\n'),
      },
      { name: 'Expires', value: `<t:${Math.floor(request.expiresAt / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `Request ${request.id} · no messages have been posted yet` });

  if (request.note) {
    embed.addFields({ name: 'Requester note', value: request.note.slice(0, 500) });
  }

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PUBLISH_CONFIRM_PREFIX}${request.id}`)
      .setLabel('Confirm as owner')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${PUBLISH_CANCEL_PREFIX}${request.id}`)
      .setLabel('Cancel request')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [buttons] };
}

export function buildPublishModal(request: PendingApplyRequest): ModalBuilder {
  const input = new TextInputBuilder()
    .setCustomId('publish-confirmation')
    .setLabel(`Type ${PUBLISH_CONFIRM_PHRASE} to confirm`)
    .setPlaceholder(PUBLISH_CONFIRM_PHRASE)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(PUBLISH_CONFIRM_PHRASE.length)
    .setMaxLength(PUBLISH_CONFIRM_PHRASE.length);

  return new ModalBuilder()
    .setCustomId(`${PUBLISH_MODAL_PREFIX}${request.id}`)
    .setTitle('Publish Kuro TV content')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
}

export function buildPublishCancelledEmbed(request: PendingApplyRequest): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Publish request cancelled')
    .setColor(0x8b5cf6)
    .setDescription(`Request \`${request.id}\` was cancelled. No messages were posted.`)
    .setTimestamp();
}
