import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ChannelType, EmbedBuilder, PermissionFlagsBits, type Client, type Guild, type TextChannel } from 'discord.js';
import { config } from '../config.js';
import {
  RELEASE_REPOSITORY,
  buildReleasePosts,
  releaseFooter,
  releaseMarker,
  releasesNewerThan,
  shouldAutoPublish,
  stableReleases,
  type GitHubRelease,
  type ReleaseChannelStatus,
  type ReleasePost,
  type ReleaseState,
} from '../content/releasePosts.js';
import { logger } from '../logger.js';
import { mirrorAudit } from './auditLog.js';
import { postedMarkersInChannel } from './contentPublisher.js';

export interface ReleasePublishContext {
  requestId: string;
  actorId: string;
  ownerId: string;
}

export interface ReleasePublishResult {
  requestId: string;
  tag: string;
  published: string[];
  skipped: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function fetchStableReleases(): Promise<GitHubRelease[]> {
  const response = await fetch(`${RELEASE_REPOSITORY.apiUrl}?per_page=10`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'kuro-discord-builder',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub releases request failed with HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('GitHub releases response was not an array.');
  return stableReleases(payload as GitHubRelease[]);
}

export async function fetchLatestStableRelease(): Promise<GitHubRelease | undefined> {
  return (await fetchStableReleases())[0];
}

export async function loadReleaseState(path: string): Promise<ReleaseState> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'initialized' in parsed) {
      const state = parsed as ReleaseState;
      return {
        initialized: Boolean(state.initialized),
        lastSeenTag: typeof state.lastSeenTag === 'string' ? state.lastSeenTag : undefined,
        updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : new Date().toISOString(),
      };
    }
  } catch {
    // Missing or unreadable state means first-run baseline, never auto-post.
  }
  return { initialized: false, updatedAt: new Date().toISOString() };
}

export async function saveReleaseState(path: string, state: ReleaseState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function resolveReleaseChannel(guild: Guild, name: string): TextChannel | undefined {
  const channel = guild.channels.cache.find(
    (candidate): candidate is TextChannel =>
      candidate.type === ChannelType.GuildText && candidate.name.toLowerCase() === name.toLowerCase(),
  );
  return channel;
}

function canUseChannel(guild: Guild, channel: TextChannel): boolean {
  const me = guild.members.me;
  const bot = me ? channel.permissionsFor(me) : null;
  const everyone = channel.permissionsFor(guild.roles.everyone);
  return Boolean(
    bot?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.SendMessages,
    ]) && !everyone?.has(PermissionFlagsBits.SendMessages),
  );
}

export function getReleaseChannelStatus(guild: Guild, channelName: string): ReleaseChannelStatus {
  const channel = resolveReleaseChannel(guild, channelName);
  if (!channel) return { channelName, state: 'missing', detail: 'channel not found; skipped' };
  const me = guild.members.me;
  const bot = me ? channel.permissionsFor(me) : null;
  const hasBotAccess = bot?.has([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.SendMessages,
  ]);
  if (!hasBotAccess) return { channelName, state: 'no-access', detail: 'bot cannot view/read/post; skipped' };
  if (channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.SendMessages)) {
    return { channelName, state: 'members-can-post', detail: 'members can post; permissions not changed; skipped' };
  }
  return { channelName, state: 'ready', detail: 'found; bot can post' };
}

/** Posts stable-release content to existing channels. No channel/permission changes. */
export async function postReleaseToGuild(
  guild: Guild,
  release: GitHubRelease,
  context: ReleasePublishContext,
): Promise<ReleasePublishResult> {
  const result: ReleasePublishResult = { requestId: context.requestId, tag: release.tag_name, published: [], skipped: [] };
  const botUserId = guild.client.user?.id;
  if (!botUserId) throw new Error('Bot user is not available.');

  const posts: ReleasePost[] = buildReleasePosts(release);
  for (const post of posts) {
    const channel = resolveReleaseChannel(guild, post.channelName);
    if (!channel) {
      result.skipped.push(`#${post.channelName}: channel missing; skipped`);
      logger.action('release.skipped', { guildId: guild.id, requestId: context.requestId, channelName: post.channelName, reason: 'missing' });
      continue;
    }
    if (!canUseChannel(guild, channel)) {
      result.skipped.push(`#${post.channelName}: bot cannot post or members can post; skipped`);
      logger.action('release.skipped', { guildId: guild.id, requestId: context.requestId, channelName: post.channelName, reason: 'unsafe-permissions' });
      continue;
    }

    try {
      const markers = await postedMarkersInChannel(channel, botUserId);
      if (markers.has(post.marker)) {
        result.skipped.push(`#${post.channelName}: already posted for ${release.tag_name}`);
        logger.action('release.duplicate_skipped', { guildId: guild.id, requestId: context.requestId, channelName: post.channelName, marker: post.marker });
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle(post.title)
        .setColor(0x8b5cf6)
        .setURL(post.url)
        .setDescription(post.content)
        .setFooter({ text: releaseFooter(release.tag_name, post.key) })
        .setTimestamp(release.published_at ? new Date(release.published_at) : undefined);

      await channel.send({ embeds: [embed], allowedMentions: { parse: [], repliedUser: false } });
      result.published.push(`#${post.channelName}`);
      logger.action('release.posted', {
        guildId: guild.id,
        requestId: context.requestId,
        tag: release.tag_name,
        channelName: post.channelName,
        channelId: channel.id,
        marker: post.marker,
      });
    } catch (error) {
      result.skipped.push(`#${post.channelName}: send failed`);
      logger.error('release.post_failed', { guildId: guild.id, requestId: context.requestId, error: errorMessage(error) });
    }
  }

  logger.action('release.completed', {
    guildId: guild.id,
    requestId: context.requestId,
    tag: release.tag_name,
    published: result.published.length,
    skipped: result.skipped.length,
  });
  return result;
}

/** Re-fetches the latest stable release at confirmation time. */
export async function publishLatestRelease(
  guild: Guild,
  context: ReleasePublishContext,
): Promise<ReleasePublishResult> {
  const release = await fetchLatestStableRelease();
  if (!release) throw new Error('No stable GitHub release was found.');
  return postReleaseToGuild(guild, release, context);
}

export class ReleaseMonitor {
  private state: ReleaseState = { initialized: false, updatedAt: new Date().toISOString() };

  constructor(private readonly client: Client) {}

  async start(): Promise<void> {
    this.state = await loadReleaseState(config.releaseStatePath);
    logger.info('release_monitor.started', {
      initialized: this.state.initialized,
      lastSeenTag: this.state.lastSeenTag,
    });
  }

  async poll(): Promise<void> {
    try {
      const releases = await fetchStableReleases();
      const latestTag = releases[0]?.tag_name;
      if (!latestTag) return;

      if (!this.state.initialized) {
        this.state = { initialized: true, lastSeenTag: latestTag, updatedAt: new Date().toISOString() };
        await saveReleaseState(config.releaseStatePath, this.state);
        logger.info('release_monitor.baseline', { tag: latestTag, autoPosted: false });
        return;
      }

      if (!shouldAutoPublish(latestTag, this.state)) return;

      const newer = releasesNewerThan(releases, this.state.lastSeenTag);
      if (newer.length === 0) {
        this.state = { initialized: true, lastSeenTag: latestTag, updatedAt: new Date().toISOString() };
        await saveReleaseState(config.releaseStatePath, this.state);
        logger.warn('release_monitor.baseline_reset', { tag: latestTag, autoPosted: false });
        return;
      }

      const guilds = config.guildId
        ? this.client.guilds.cache.get(config.guildId)
          ? [this.client.guilds.cache.get(config.guildId)!]
          : []
        : [...this.client.guilds.cache.values()];

      for (const release of newer) {
        for (const guild of guilds) {
          const result = await postReleaseToGuild(guild, release, {
            requestId: `auto-${release.tag_name}`,
            actorId: 'release-monitor',
            ownerId: 'automatic',
          });
          await mirrorAudit(
            guild.client,
            new EmbedBuilder()
              .setTitle(`Automatic release post — ${release.tag_name}`)
              .setDescription(`Published: ${result.published.join(', ') || 'none'}\nSkipped: ${result.skipped.join(', ') || 'none'}`)
              .setTimestamp(),
          );
        }
        this.state = { initialized: true, lastSeenTag: release.tag_name, updatedAt: new Date().toISOString() };
        await saveReleaseState(config.releaseStatePath, this.state);
      }
    } catch (error) {
      logger.error('release_monitor.poll_failed', { error: errorMessage(error) });
    }
  }
}

export { releaseMarker };
