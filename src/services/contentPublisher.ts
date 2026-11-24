import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Guild,
  type TextChannel,
} from 'discord.js';
import {
  PUBLISH_CONTENT,
  contentFooter,
  contentMarker,
  resolveContentChannels,
  type ContentKey,
  type ContentTargetStatus,
  type ContentItem,
} from '../content/publishContent.js';
import { logger } from '../logger.js';
import { mirrorAudit } from './auditLog.js';

const readOnlyRequired: ReadonlySet<ContentKey> = new Set(['announcements']);

export interface ResolvedContentTarget {
  item: ContentItem;
  channel?: TextChannel;
  status: ContentTargetStatus;
}

export interface PublishContext {
  requestId: string;
  actorId: string;
  ownerId: string;
}

export interface PublishResult {
  requestId: string;
  posted: string[];
  skippedMissing: string[];
  skippedNoAccess: string[];
  skippedMembersCanPost: string[];
  skippedDuplicates: string[];
}

/** Resolves exact channel names. Never creates channels or changes permissions. */
export async function resolveContentTargets(guild: Guild): Promise<ResolvedContentTarget[]> {
  const channels = await guild.channels.fetch();
  const textChannels = [...channels.values()].filter(
    (channel): channel is TextChannel => channel?.type === ChannelType.GuildText,
  );
  const me = guild.members.me;
  const everyone = guild.roles.everyone;
  const resolved: ResolvedContentTarget[] = [];

  for (const { item, channel, state } of resolveContentChannels(textChannels)) {
    if (state === 'missing' || !channel) {
      resolved.push({
        item,
        status: {
          key: item.key,
          channelName: item.channelName,
          state: 'missing',
          detail: 'channel not found; skipped',
        },
      });
      continue;
    }

    const botPermissions = me ? channel.permissionsFor(me) : null;
    if (
      !me ||
      !botPermissions?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
      ])
    ) {
      resolved.push({
        item,
        channel,
        status: {
          key: item.key,
          channelName: item.channelName,
          state: 'no-access',
          detail: 'bot cannot view, read history, and post here; skipped',
        },
      });
      continue;
    }

    if (readOnlyRequired.has(item.key) && channel.permissionsFor(everyone)?.has(PermissionFlagsBits.SendMessages)) {
      resolved.push({
        item,
        channel,
        status: {
          key: item.key,
          channelName: item.channelName,
          state: 'members-can-post',
          detail: 'ordinary members can post here; permissions were not changed, so skipped',
        },
      });
      continue;
    }

    resolved.push({
      item,
      channel,
      status: {
        key: item.key,
        channelName: item.channelName,
        state: 'ready',
        detail: 'found; bot can post',
      },
    });
  }

  return resolved;
}

/** Scans recent history for the bot's own marked posts, so retries are safe after restarts. */
export async function postedMarkersInChannel(channel: TextChannel, botUserId: string): Promise<Set<string>> {
  const markers = new Set<string>();
  const messages = await channel.messages.fetch({ limit: 100 });
  for (const message of messages.values()) {
    if (message.author.id !== botUserId) continue;
    for (const embed of message.embeds) {
      const footer = embed.footer?.text;
      if (!footer) continue;
      for (const key of PUBLISH_CONTENT.map((item) => item.key)) {
        if (footer.includes(contentMarker(key))) markers.add(contentMarker(key));
      }
    }
  }
  return markers;
}

export async function publishContent(guild: Guild, context: PublishContext): Promise<PublishResult> {
  const result: PublishResult = {
    requestId: context.requestId,
    posted: [],
    skippedMissing: [],
    skippedNoAccess: [],
    skippedMembersCanPost: [],
    skippedDuplicates: [],
  };
  const botUserId = guild.client.user?.id;
  if (!botUserId) throw new Error('Bot user is not available. Retry after the bot is ready.');

  const targets = await resolveContentTargets(guild);
  logger.action('publish.started', {
    guildId: guild.id,
    requestId: context.requestId,
    ownerId: context.ownerId,
    targets: targets.length,
  });

  for (const target of targets) {
    const { item, channel, status } = target;

    if (!channel || status.state !== 'ready') {
      const bucket =
        status.state === 'missing'
          ? result.skippedMissing
          : status.state === 'no-access'
            ? result.skippedNoAccess
            : result.skippedMembersCanPost;
      bucket.push(`#${item.channelName}: ${status.detail}`);
      logger.action('publish.skipped', {
        guildId: guild.id,
        requestId: context.requestId,
        channelName: item.channelName,
        reason: status.state,
        detail: status.detail,
      });
      continue;
    }

    try {
      const markers = await postedMarkersInChannel(channel, botUserId);
      if (markers.has(contentMarker(item.key))) {
        result.skippedDuplicates.push(`#${item.channelName}: already posted by this bot`);
        logger.action('publish.duplicate_skipped', {
          guildId: guild.id,
          requestId: context.requestId,
          channelName: item.channelName,
          marker: contentMarker(item.key),
        });
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle(item.title)
        .setColor(0x8b5cf6)
        .setDescription(item.content)
        .setFooter({ text: contentFooter(item.key) })
        .setTimestamp();

      await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [], repliedUser: false },
      });
      result.posted.push(`#${item.channelName}`);
      logger.action('publish.posted', {
        guildId: guild.id,
        requestId: context.requestId,
        channelName: item.channelName,
        channelId: channel.id,
        marker: contentMarker(item.key),
      });
    } catch (error) {
      result.skippedNoAccess.push(`#${item.channelName}: send/history check failed`);
      logger.error('publish.channel_failed', {
        guildId: guild.id,
        requestId: context.requestId,
        channelName: item.channelName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.action('publish.completed', {
    guildId: guild.id,
    requestId: context.requestId,
    posted: result.posted.length,
    skippedMissing: result.skippedMissing.length,
    skippedNoAccess: result.skippedNoAccess.length,
    skippedMembersCanPost: result.skippedMembersCanPost.length,
    skippedDuplicates: result.skippedDuplicates.length,
  });

  const summary = new EmbedBuilder()
    .setTitle('Kuro TV content publish complete')
    .setColor(0x22c55e)
    .setDescription(`Approved by the server owner. Posted ${result.posted.length} of ${PUBLISH_CONTENT.length} messages.`)
    .addFields(
      { name: 'Posted', value: result.posted.join('\n') || 'None' },
      {
        name: 'Skipped',
        value: [
          ...result.skippedDuplicates,
          ...result.skippedMissing,
          ...result.skippedNoAccess,
          ...result.skippedMembersCanPost,
        ].join('\n') || 'None',
      },
    )
    .setFooter({ text: 'No existing messages were edited or deleted; nothing was pinned.' })
    .setTimestamp();

  await mirrorAudit(guild.client, summary);
  return result;
}

export function buildPublishSummaryEmbed(result: PublishResult): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(result.posted.length > 0 ? 'Content published' : 'Nothing published')
    .setColor(result.posted.length > 0 ? 0x8b5cf6 : 0xf59e0b)
    .setDescription(
      `Posted ${result.posted.length} message(s). Existing messages were never edited or deleted, and retries skip posts already made by this bot.`,
    )
    .addFields(
      { name: 'Posted', value: result.posted.join('\n') || 'None' },
      {
        name: 'Skipped',
        value: [
          ...result.skippedDuplicates,
          ...result.skippedMissing,
          ...result.skippedNoAccess,
          ...result.skippedMembersCanPost,
        ].join('\n').slice(0, 1024) || 'None',
      },
    )
    .setFooter({ text: `Request ${result.requestId} · no pings or permission changes` })
    .setTimestamp();
}
