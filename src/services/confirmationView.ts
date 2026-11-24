import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { KURO_BRAND } from '../plan/planView.js';
import { planCounts, type ServerPlan } from '../plan/serverPlan.js';
import type { PendingApplyRequest } from './confirmationService.js';

export const CONFIRM_PREFIX = 'apply:confirm:';
export const CANCEL_PREFIX = 'apply:cancel:';
export const MODAL_PREFIX = 'apply:modal:';

export function buildConfirmationMessage(
  request: PendingApplyRequest,
  plan: ServerPlan,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const counts = planCounts(plan);
  const embed = new EmbedBuilder()
    .setTitle('Owner confirmation required')
    .setColor(0xf59e0b)
    .setDescription(
      `<@${request.requesterId}> requested \`/apply\`. Only the **server owner** can approve it. ` +
        'Press **Confirm as owner**, then type `APPLY` in the dialog.',
    )
    .addFields(
      {
        name: 'What will happen',
        value:
          `Create ${counts.roles} roles, ${counts.categories} categories and ${counts.channels} channels ` +
          'from the reviewed Kuro TV plan. Existing resources are skipped, never edited or deleted.',
      },
      { name: 'Expires', value: `<t:${Math.floor(request.expiresAt / 1000)}:R>`, inline: true },
      { name: 'Plan', value: `${plan.id} · v${plan.version}`, inline: true },
    )
    .setFooter({ text: `Request ${request.id} · no changes have been made yet` });

  if (request.note) {
    embed.addFields({ name: 'Requester note', value: request.note.replace(/[\r\n]+/g, ' ').slice(0, 500) });
  }

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CONFIRM_PREFIX}${request.id}`)
      .setLabel('Confirm as owner')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${CANCEL_PREFIX}${request.id}`)
      .setLabel('Cancel request')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [buttons] };
}

export function buildCancelledEmbed(request: PendingApplyRequest): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Apply request cancelled')
    .setColor(KURO_BRAND)
    .setDescription(`Request \`${request.id}\` was cancelled. No server changes were made.`)
    .setTimestamp();
}

export function buildConfirmationModal(request: PendingApplyRequest): ModalBuilder {
  const input = new TextInputBuilder()
    .setCustomId('confirmation')
    .setLabel('Type APPLY to confirm')
    .setPlaceholder('APPLY')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(5)
    .setMaxLength(5);

  return new ModalBuilder()
    .setCustomId(`${MODAL_PREFIX}${request.id}`)
    .setTitle('Confirm Kuro server setup')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
}
