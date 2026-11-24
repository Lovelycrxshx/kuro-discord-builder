import { Interaction, MessageFlags, type ButtonInteraction, type ModalSubmitInteraction } from 'discord.js';
import { commandsByName } from './commands/index.js';
import { validPublishPhrase } from './content/publishContent.js';
import { logger } from './logger.js';
import { KURO_SERVER_PLAN } from './plan/serverPlan.js';
import {
  confirmations,
  type PendingApplyRequest,
  type RequestKind,
} from './services/confirmationService.js';
import {
  buildCancelledEmbed,
  buildConfirmationModal,
  CANCEL_PREFIX,
  CONFIRM_PREFIX,
  MODAL_PREFIX,
} from './services/confirmationView.js';
import { buildPublishSummaryEmbed, publishContent } from './services/contentPublisher.js';
import {
  buildPublishCancelledEmbed,
  buildPublishModal,
  PUBLISH_CANCEL_PREFIX,
  PUBLISH_CONFIRM_PREFIX,
  PUBLISH_MODAL_PREFIX,
} from './services/publishConfirmationView.js';
import { applyPlan, buildApplyResultEmbed } from './services/serverBuilder.js';

async function replyEphemeral(interaction: Interaction, content: string): Promise<void> {
  if (!interaction.isRepliable()) return;
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}

function validRequest(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  requestId: string,
  kind: RequestKind,
): PendingApplyRequest | undefined {
  const request = confirmations.get(requestId);
  if (
    !request ||
    request.kind !== kind ||
    request.guildId !== interaction.guildId ||
    request.status !== 'pending'
  ) {
    return undefined;
  }
  return request;
}

async function handleConfirmButton(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return replyEphemeral(interaction, 'This can only be used in a server.');

  const request = validRequest(interaction, requestId, 'apply');
  if (!request) return replyEphemeral(interaction, 'That apply request is no longer valid or has expired.');

  if (guild.ownerId !== interaction.user.id) {
    logger.warn('apply.confirmation.rejected_not_owner', {
      guildId: guild.id,
      requestId,
      userId: interaction.user.id,
      ownerId: guild.ownerId,
    });
    return replyEphemeral(interaction, 'Only the server owner can confirm. No changes were made.');
  }

  await interaction.showModal(buildConfirmationModal(request));
  logger.action('apply.confirmation_prompted', {
    guildId: guild.id,
    requestId,
    ownerId: interaction.user.id,
  });
}

async function handleCancelButton(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return replyEphemeral(interaction, 'This can only be used in a server.');

  const request = validRequest(interaction, requestId, 'apply');
  if (!request) return replyEphemeral(interaction, 'That apply request is no longer valid or has expired.');

  if (interaction.user.id !== request.requesterId && interaction.user.id !== guild.ownerId) {
    return replyEphemeral(interaction, 'Only the requester or the server owner can cancel this request.');
  }
  if (!confirmations.cancel(requestId)) {
    return replyEphemeral(interaction, 'That request was already closed.');
  }

  await interaction.update({ embeds: [buildCancelledEmbed(request)], components: [] });
  logger.action('apply.cancelled', {
    guildId: guild.id,
    requestId,
    userId: interaction.user.id,
  });
}

async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const requestId = interaction.customId.slice(MODAL_PREFIX.length);
  const guild = interaction.guild;
  if (!guild) return replyEphemeral(interaction, 'This can only be used in a server.');

  const request = validRequest(interaction, requestId, 'apply');
  if (!request) return replyEphemeral(interaction, 'That apply request is no longer valid or has expired.');

  if (guild.ownerId !== interaction.user.id) {
    logger.warn('apply.modal.rejected_not_owner', {
      guildId: guild.id,
      requestId,
      userId: interaction.user.id,
    });
    return replyEphemeral(interaction, 'Only the server owner can approve this. No changes were made.');
  }

  const typed = interaction.fields.getTextInputValue('confirmation');
  if (typed.trim().toUpperCase() !== 'APPLY') {
    logger.warn('apply.modal.wrong_phrase', { guildId: guild.id, requestId });
    return replyEphemeral(interaction, 'Confirmation text did not match `APPLY`. No changes were made.');
  }

  // Consume before mutating so a replayed interaction cannot apply twice.
  if (!confirmations.consume(requestId)) {
    return replyEphemeral(interaction, 'This request was already used. Create a new /apply request if needed.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await applyPlan(guild, KURO_SERVER_PLAN, {
    requestId,
    actorId: request.requesterId,
    ownerId: interaction.user.id,
  });
  await interaction.editReply({ embeds: [buildApplyResultEmbed(result)] });
}

async function handlePublishConfirmButton(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return replyEphemeral(interaction, 'This can only be used in a server.');

  const request = validRequest(interaction, requestId, 'publish');
  if (!request) return replyEphemeral(interaction, 'That publish request is no longer valid or has expired.');

  if (guild.ownerId !== interaction.user.id) {
    logger.warn('publish.confirmation.rejected_not_owner', {
      guildId: guild.id,
      requestId,
      userId: interaction.user.id,
      ownerId: guild.ownerId,
    });
    return replyEphemeral(interaction, 'Only the server owner can publish. No messages were posted.');
  }

  await interaction.showModal(buildPublishModal(request));
  logger.action('publish.confirmation_prompted', {
    guildId: guild.id,
    requestId,
    ownerId: interaction.user.id,
  });
}

async function handlePublishCancelButton(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return replyEphemeral(interaction, 'This can only be used in a server.');

  const request = validRequest(interaction, requestId, 'publish');
  if (!request) return replyEphemeral(interaction, 'That publish request is no longer valid or has expired.');

  if (interaction.user.id !== request.requesterId && interaction.user.id !== guild.ownerId) {
    return replyEphemeral(interaction, 'Only the requester or the server owner can cancel this request.');
  }
  if (!confirmations.cancel(requestId)) {
    return replyEphemeral(interaction, 'That request was already closed.');
  }

  await interaction.update({ embeds: [buildPublishCancelledEmbed(request)], components: [] });
  logger.action('publish.cancelled', {
    guildId: guild.id,
    requestId,
    userId: interaction.user.id,
  });
}

async function handlePublishModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const requestId = interaction.customId.slice(PUBLISH_MODAL_PREFIX.length);
  const guild = interaction.guild;
  if (!guild) return replyEphemeral(interaction, 'This can only be used in a server.');

  const request = validRequest(interaction, requestId, 'publish');
  if (!request) return replyEphemeral(interaction, 'That publish request is no longer valid or has expired.');

  if (guild.ownerId !== interaction.user.id) {
    logger.warn('publish.modal.rejected_not_owner', {
      guildId: guild.id,
      requestId,
      userId: interaction.user.id,
    });
    return replyEphemeral(interaction, 'Only the server owner can publish. No messages were posted.');
  }

  const typed = interaction.fields.getTextInputValue('publish-confirmation');
  if (!validPublishPhrase(typed)) {
    logger.warn('publish.modal.wrong_phrase', { guildId: guild.id, requestId });
    return replyEphemeral(interaction, 'Confirmation text did not match `PUBLISH`. No messages were posted.');
  }

  if (!confirmations.consume(requestId)) {
    return replyEphemeral(interaction, 'This request was already used. Run /publish-content again.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await publishContent(guild, {
    requestId,
    actorId: request.requesterId,
    ownerId: interaction.user.id,
  });
  await interaction.editReply({ embeds: [buildPublishSummaryEmbed(result)] });
}

export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commandsByName[interaction.commandName];
      if (!command) {
        logger.warn('command.unknown', { commandName: interaction.commandName });
        return replyEphemeral(interaction, 'Unknown command.');
      }
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith(CONFIRM_PREFIX)) {
        await handleConfirmButton(interaction, customId.slice(CONFIRM_PREFIX.length));
      } else if (customId.startsWith(CANCEL_PREFIX)) {
        await handleCancelButton(interaction, customId.slice(CANCEL_PREFIX.length));
      } else if (customId.startsWith(PUBLISH_CONFIRM_PREFIX)) {
        await handlePublishConfirmButton(interaction, customId.slice(PUBLISH_CONFIRM_PREFIX.length));
      } else if (customId.startsWith(PUBLISH_CANCEL_PREFIX)) {
        await handlePublishCancelButton(interaction, customId.slice(PUBLISH_CANCEL_PREFIX.length));
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith(MODAL_PREFIX)) {
        await handleModalSubmit(interaction);
      } else if (interaction.customId.startsWith(PUBLISH_MODAL_PREFIX)) {
        await handlePublishModalSubmit(interaction);
      }
    }
  } catch (error) {
    logger.error('interaction.failed', {
      type: interaction.type,
      commandName: interaction.isChatInputCommand() ? interaction.commandName : undefined,
      customId: interaction.isButton() || interaction.isModalSubmit() ? interaction.customId : undefined,
      guildId: interaction.guildId ?? undefined,
      error: error instanceof Error ? error.message : String(error),
    });
    await replyEphemeral(interaction, 'Something went wrong. The action was logged; please try again.');
  }
}
