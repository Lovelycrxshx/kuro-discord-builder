import { Client, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/** Mirrors an audit entry to LOG_CHANNEL_ID. Failures never block a bot action. */
export async function mirrorAudit(client: Client, embed: EmbedBuilder): Promise<void> {
  if (!config.logChannelId) return;
  try {
    const channel = await client.channels.fetch(config.logChannelId);
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      logger.warn('audit_log.channel_invalid', { channelId: config.logChannelId });
      return;
    }
    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn('audit_log.channel_failed', {
      channelId: config.logChannelId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
