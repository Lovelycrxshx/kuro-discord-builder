import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { KURO_OFFICIAL_LINKS } from '../links.js';

export { KURO_OFFICIAL_LINKS };

export interface KuroReleaseOptions {
  /** Version label, for example "1.5.5". */
  version: string;
  /** Short, user-facing highlights. */
  highlights: readonly string[];
  title?: string;
  description?: string;
  /** SHA-256 of the signed APK, if you want members to verify the download. */
  checksum?: string;
  /** Official .sha256 companion file link. */
  checksumUrl?: string;
  /** ISO date. Defaults to now. */
  publishedAt?: string;
  /** Must be an official Kuro-tv-Releases GitHub URL. Defaults to the latest release. */
  notesUrl?: string;
  /** Must be an official GitHub Releases APK URL from Kuro-tv-Releases. */
  directApkUrl?: string;
}

/**
 * Rich, verified Kuro 1.5.5 announcement content.
 * Sourced from RELEASE-1.5.5.md in Lovelycrxshx/Kuro-tv-Releases.
 * No checksum is hard-coded: the official .sha256 companion file is linked instead.
 */
export const KURO_1_5_5_ANNOUNCEMENT: Readonly<KuroReleaseOptions> = {
  version: '1.5.5',
  title: 'Kuro 1.5.5 — Profile Art Studio is here',
  description:
    'Kuro **1.5.5** (versionCode 107) is live on GitHub Releases. It ships the interactive **Profile Art Studio**, ' +
    'CSP-safe avatar/banner rendering, and the full 1.5.4 feature set. Install over the top — same package and signing key, so your profiles and downloads stay put.',
  highlights: [
    'Profile Art Studio: live 16:9 banner + avatar preview, Split / Paired Sets / Avatars / Banners tabs, instant search, and gallery uploads.',
    'CSP-safe PFP & banner rendering with native <img> across Account hero, header chip, profile drawer, and Watch header.',
    'Streamlined YouTube-style Watch page: 5 servers per page, Other servers pill, 3-row episode playlist, and horizontal More anime shelf.',
    'Cinematic Title Detail v2: full-bleed hero, Franchise & Watch-Order strip, Canon / Filler / Recap badges, Skip Filler, and batch offline download.',
    'Smart multi-filter Browse & native voice search with OLED filter pills and compact SUB | DUB poster pills.',
    'Desktop left-rail & Android TV / Fire TV Leanback UI with frosted OLED rail, DPAD focus halo, and remote navigation.',
    'Encrypted DNS (DoH), 8-lane catalog engine, HLS fallback, low-RAM WebView recovery, and 3-layer Player Ad-Guard.',
    '40 anime & manga Profile Art sets (art-11–art-50), two-way AniList / MyAnimeList sync, and Discord Rich Presence hub.',
    'Clean iconography, native touch controls, and adjustable App DPI & UI Size. Signature Violet is the default theme again.',
  ],
  publishedAt: '2026-11-24T10:35:14Z',
  notesUrl: KURO_OFFICIAL_LINKS.release155,
  directApkUrl: KURO_OFFICIAL_LINKS.apk155,
  checksumUrl: KURO_OFFICIAL_LINKS.checksum155,
};

/** Convenience builder for the verified 1.5.5 preset. */
export function buildKuro155Announcement(): ReturnType<typeof buildReleaseAnnouncement> {
  return buildReleaseAnnouncement(KURO_1_5_5_ANNOUNCEMENT);
}

const repositoryPrefix = KURO_OFFICIAL_LINKS.repository;
const downloadPrefix = `${KURO_OFFICIAL_LINKS.repository}/releases/download/`;

function oneLine(value: string, max = 120): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function officialUrl(value: string | undefined, prefixes: readonly string[], fallback: string): string {
  if (!value) return fallback;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Release links must be valid absolute HTTPS URLs.');
  }
  const isAllowed = prefixes.some((prefix) => {
    const base = prefix.replace(/\/$/, '');
    return parsed.href === base || parsed.href.startsWith(`${base}/`);
  });
  if (parsed.protocol !== 'https:' || !isAllowed) {
    throw new Error('Only official Lovelycrxshx/Kuro-tv-Releases HTTPS links are accepted.');
  }
  return parsed.href;
}

function highlightFields(highlights: readonly string[]): Array<{ name: string; value: string }> {
  const lines = highlights
    .map((item) => `• ${oneLine(item, 165)}`)
    .filter((item) => item.length > 2)
    .slice(0, 10);
  if (lines.length === 0) return [{ name: 'Highlights', value: 'See the official release notes for full details.' }];

  const groups: string[][] = [];
  for (let index = 0; index < lines.length; index += 5) groups.push(lines.slice(index, index + 5));
  return groups.map((group, index) => ({
    name: groups.length === 1 ? 'Highlights' : `Highlights (${index + 1}/${groups.length})`,
    value: group.join('\n').slice(0, 1024),
  }));
}

/**
 * Builds the Kuro TV release announcement. No network calls and no posting;
 * callers decide where (if anywhere) to publish the returned payload.
 */
export function buildReleaseAnnouncement(options: KuroReleaseOptions): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const version = oneLine(options.version, 40);
  if (!version) throw new Error('A release version is required.');

  const notesUrl = officialUrl(options.notesUrl, [repositoryPrefix], KURO_OFFICIAL_LINKS.latestRelease);
  const apkUrl = options.directApkUrl
    ? officialUrl(options.directApkUrl, [downloadPrefix], KURO_OFFICIAL_LINKS.latestRelease)
    : undefined;
  const checksumUrl = options.checksumUrl
    ? officialUrl(options.checksumUrl, [downloadPrefix], KURO_OFFICIAL_LINKS.latestRelease)
    : undefined;

  const embed = new EmbedBuilder()
    .setTitle(options.title ? oneLine(options.title, 100) : `Kuro TV ${version} is out`)
    .setURL(notesUrl)
    .setColor(0x8b5cf6)
    .setDescription(
      options.description
        ? oneLine(options.description, 500)
        : 'New Kuro TV build available. Kuro is an open-source media player/front-end — it hosts no media. ' +
          'Always download from the official GitHub release.',
    )
    .addFields(
      ...highlightFields(options.highlights),
      {
        name: 'Official links',
        value: [
          `[Latest release](${KURO_OFFICIAL_LINKS.latestRelease})`,
          `[v1.5.5 release](${KURO_OFFICIAL_LINKS.release155})`,
          `[All releases](${KURO_OFFICIAL_LINKS.releases})`,
          `[Source repository](${KURO_OFFICIAL_LINKS.repository})`,
          `[Download & checksum page](${KURO_OFFICIAL_LINKS.downloadPage})`,
          `[Roadmap](${KURO_OFFICIAL_LINKS.roadmap})`,
          `[Server builder source](${KURO_OFFICIAL_LINKS.builderRepository})`,
        ].join(' · '),
      },
    )
    .setFooter({ text: 'Kuro TV · official GitHub release announcement' });

  if (options.checksum || checksumUrl) {
    const parts: string[] = [];
    if (options.checksum) parts.push(`SHA-256: \`${oneLine(options.checksum, 128)}\``);
    if (checksumUrl) parts.push(`[Official .sha256 file](${checksumUrl})`);
    embed.addFields({ name: 'Verify the APK', value: parts.join('\n') });
  }

  if (options.publishedAt) {
    const timestamp = new Date(options.publishedAt);
    if (Number.isNaN(timestamp.getTime())) {
      throw new Error('publishedAt must be a valid ISO date string.');
    }
    embed.setTimestamp(timestamp);
  } else {
    embed.setTimestamp();
  }

  const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Download latest (GitHub)')
      .setStyle(ButtonStyle.Link)
      .setURL(KURO_OFFICIAL_LINKS.latestRelease),
    new ButtonBuilder().setLabel('Release notes').setStyle(ButtonStyle.Link).setURL(notesUrl),
    new ButtonBuilder().setLabel('Source').setStyle(ButtonStyle.Link).setURL(KURO_OFFICIAL_LINKS.repository),
  );

  const secondary = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...(apkUrl
      ? [new ButtonBuilder().setLabel('Direct APK (GitHub)').setStyle(ButtonStyle.Link).setURL(apkUrl)]
      : []),
    ...(checksumUrl
      ? [new ButtonBuilder().setLabel('Checksum .sha256').setStyle(ButtonStyle.Link).setURL(checksumUrl)]
      : []),
    new ButtonBuilder()
      .setLabel('Download page')
      .setStyle(ButtonStyle.Link)
      .setURL(KURO_OFFICIAL_LINKS.downloadPage),
    new ButtonBuilder().setLabel('Report an issue').setStyle(ButtonStyle.Link).setURL(KURO_OFFICIAL_LINKS.issues),
  );

  return { embeds: [embed], components: [primary, secondary] };
}
