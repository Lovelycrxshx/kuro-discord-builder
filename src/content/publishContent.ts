import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

export const PUBLISH_CONTENT_VERSION = '1.0.0';
export const PUBLISH_CONFIRM_PHRASE = 'PUBLISH';

export type ContentKey = 'welcome' | 'rules' | 'serverGuide' | 'announcements' | 'androidReleases';

export interface ContentItem {
  key: ContentKey;
  channelName: string;
  title: string;
  content: string;
}

export type TargetState = 'ready' | 'missing' | 'no-access' | 'members-can-post';

export interface ContentTargetStatus {
  key: ContentKey;
  channelName: string;
  state: TargetState;
  detail: string;
}

export interface PostLike {
  authorId: string;
  footerTexts: readonly string[];
}

export interface ContentResolution<T> {
  item: ContentItem;
  channel?: T;
  state: 'ready' | 'missing';
}

/** Pure name resolution used by /publish-content and by tests. Never creates channels. */
export function resolveContentChannels<T extends { name: string }>(
  channels: readonly T[],
): Array<ContentResolution<T>> {
  return PUBLISH_CONTENT.map((item) => {
    const channel = channels.find(
      (candidate) => candidate.name.toLowerCase() === item.channelName.toLowerCase(),
    );
    return channel ? { item, channel, state: 'ready' as const } : { item, state: 'missing' as const };
  });
}

export const PUBLISH_CONTENT: readonly ContentItem[] = [
  {
    key: 'welcome',
    channelName: 'welcome',
    title: 'Welcome to Kuro TV 👋',
    content: [
      'Welcome to the Kuro TV community! 👋',
      '',
      'Kuro TV is an open-source media player/front-end for Android TV, Fire TV, and mobile devices. It does not host, upload, or provide media streams — you supply your own sources locally.',
      '',
      'New here? Start with:',
      '• #rules — community guidelines',
      '• #server-guide — channel and role overview',
      '• #help — ask for help',
      '• #android-releases — verified APK downloads and official release notes',
      '',
      'Be kind, search before asking, and enjoy the community.',
    ].join('\n'),
  },
  {
    key: 'rules',
    channelName: 'rules',
    title: 'Community rules',
    content: [
      'Thanks for helping keep this community welcoming and useful.',
      '',
      '• **Respect others.** No harassment, hate, spam, or personal attacks.',
      '• **Mark spoilers.** Use spoiler tags or clear warnings for plot details.',
      '• **No piracy or stream links.** Kuro is a player/front-end; it does not host media. Do not request or share copyrighted downloads, stream links, or source lists.',
      '• **Use official APK links only.** Download from the GitHub Releases page linked in #android-releases.',
      '• **Protect secrets and privacy.** Never post passwords, bot tokens, API keys, private URLs, or personal details — yours or anyone else’s.',
      '• **Do not mass-mention members or roles.**',
      '• **Keep posts on-topic.** Use #help and #bug-reports for support, and #release-discussion for release chat.',
    ].join('\n'),
  },
  {
    key: 'serverGuide',
    channelName: 'server-guide',
    title: 'Server guide',
    content: [
      'Here is a quick map of the server.',
      '',
      '**Categories:** 📌 START HERE, 📢 ANNOUNCEMENTS, 📦 DOWNLOADS & RELEASES, 💬 COMMUNITY, 🆘 SUPPORT, 📺 DEVICE SELECTION, 🎉 EVENTS, 🧑‍💻 DEVELOPMENT, and 🔒 STAFF.',
      '',
      '**Roles:** Kuro Android TV, Kuro Fire TV, and Kuro Mobile help us organise device-specific help. Kuro Release Alerts is for release notifications, Kuro Event Goer for events, and Kuro Beta Tester for beta areas. Roles are assigned by the server team; this bot does not run a self-role menu.',
      '',
      '**Ask for useful help:** in #help, include your Kuro version (and versionCode if known), device and Android version, what you expected, what actually happened, and the steps to reproduce. Remove personal details from screenshots and logs.',
      '',
      '**Report a bug:** in #bug-reports, use the same details plus the exact Kuro version. Kuro 1.5.5 is versionCode 107.',
    ].join('\n'),
  },
  {
    key: 'announcements',
    channelName: 'announcements',
    title: 'Kuro TV announcements',
    content: [
      'Welcome to Kuro TV announcements.',
      '',
      'We will share truthful project updates and community news here when there is something to share. There is no new news in this post — it is simply the channel introduction.',
      '',
      'For discussion, head to #release-discussion or #general. Official downloads and release notes always live in #android-releases and on the project’s GitHub Releases page.',
    ].join('\n'),
  },
  {
    key: 'androidReleases',
    channelName: 'android-releases',
    title: 'Kuro TV 1.5.5 for Android',
    content: [
      '**Kuro TV 1.5.5 (versionCode 107)** is available on GitHub Releases.',
      '',
      'Kuro is an open-source media player/front-end for Android TV, Fire TV, and mobile devices. It does not host, upload, or provide media streams; catalogue sources run locally on your device.',
      '',
      '**What is in 1.5.5** (from RELEASE-1.5.5.md):',
      '• Interactive **Profile Art Studio** with a live 16:9 banner + avatar preview stage.',
      '• Strict-CSP-safe profile pictures and banners rendered with native `<img>` elements.',
      '• Streamlined YouTube-style Watch page: 5 servers per page, an “Other servers” pill, a 3-row episode playlist, and a horizontal “More anime” shelf.',
      '• Cinematic Title Detail v2 with a watch-order strip, Canon / Filler / Recap badges, Skip Filler, and batch offline download.',
      '• Smart multi-filter Browse with native voice search and compact SUB | DUB poster pills.',
      '• Desktop left-rail and Android TV / Fire TV Leanback UI with DPAD focus navigation.',
      '• Encrypted DNS (DoH), an 8-lane catalog engine, HLS fallback, and a multi-layer Player Ad-Guard.',
      '• 40 anime & manga Profile Art sets, two-way AniList / MyAnimeList sync, and a Discord Rich Presence hub.',
      '',
      '**Install:** install over the top; same package `app.lovelycrxshx.kuro` and signing key, so profiles and downloads stay put. No uninstall needed.',
      '**Verify:** compare the APK with the official SHA-256 companion file before installing.',
      '',
      '**Official links:**',
      '• APK: https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/download/v1.5.5/Kuro-tv-1.5.5.apk',
      '• Release notes: https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/tag/v1.5.5',
      '• Download page: https://lovelycrxshx.github.io/Kuro-tv-Releases/',
      '• SHA-256: https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/download/v1.5.5/Kuro-tv-1.5.5.apk.sha256',
    ].join('\n'),
  },
];

/** Hidden-in-plain-sight idempotency marker stored in the embed footer. */
export function contentMarker(key: ContentKey): string {
  return `kuro-content:${key}:v${PUBLISH_CONTENT_VERSION}`;
}

export function contentFooter(key: ContentKey): string {
  return `Kuro TV content · ${key} · ${contentMarker(key)}`;
}

export function isServerOwner(actorId: string, ownerId: string): boolean {
  return actorId === ownerId;
}

export function validPublishPhrase(phrase: string): boolean {
  return phrase.trim().toUpperCase() === PUBLISH_CONFIRM_PHRASE;
}

/** True when the bot has already posted this exact content item in a channel. */
export function alreadyPosted(posts: readonly PostLike[], botUserId: string, key: ContentKey): boolean {
  const marker = contentMarker(key);
  return posts.some(
    (post) => post.authorId === botUserId && post.footerTexts.some((text) => text.includes(marker)),
  );
}

/** Retries only publish items that have not already been posted by the bot. */
export function pendingContent(
  items: readonly ContentItem[],
  postedMarkers: ReadonlySet<string>,
): ContentItem[] {
  return items.filter((item) => !postedMarkers.has(contentMarker(item.key)));
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Ephemeral preview. Nothing is posted to any channel by this function. */
export function buildPublishPreview(statuses: readonly ContentTargetStatus[] = []): {
  embeds: EmbedBuilder[];
  files: AttachmentBuilder[];
} {
  const statusByKey = new Map(statuses.map((status) => [status.key, status]));

  const embeds = PUBLISH_CONTENT.map((item) => {
    const status = statusByKey.get(item.key);
    const state = status ? `${status.state} — ${status.detail}` : 'status not checked';
    return new EmbedBuilder()
      .setTitle(`Preview · #${item.channelName}`)
      .setColor(0x8b5cf6)
      .setDescription(clip(item.content, 900))
      .addFields(
        { name: 'Channel status', value: clip(state, 300) },
        { name: 'Idempotency marker', value: `\`${contentMarker(item.key)}\`` },
      )
      .setFooter({ text: 'Preview only — nothing has been posted' });
  });

  const markdown = PUBLISH_CONTENT.map(
    (item) =>
      `# #${item.channelName}\n\n${item.title}\n\n${item.content}\n\n---\nMarker: \`${contentMarker(item.key)}\`\n`,
  ).join('\n');

  const file = new AttachmentBuilder(Buffer.from(markdown, 'utf8'), {
    name: 'kuro-content-preview.md',
    description: 'Full Kuro TV content preview',
  });

  return { embeds, files: [file] };
}
