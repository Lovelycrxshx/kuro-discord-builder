export const RELEASE_POST_VERSION = '1.0.0';
export const RELEASE_REPOSITORY = {
  owner: 'Lovelycrxshx',
  repo: 'Kuro-tv-Releases',
  apiUrl: 'https://api.github.com/repos/Lovelycrxshx/Kuro-tv-Releases/releases',
} as const;

const releasePrefix = `https://github.com/${RELEASE_REPOSITORY.owner}/${RELEASE_REPOSITORY.repo}/releases/`;
const downloadPrefix = `${releasePrefix}download/`;

export type ReleasePostKind = 'notes' | 'apk';

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
  content_type?: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

export interface ReleasePost {
  key: ReleasePostKind;
  channelName: string;
  title: string;
  content: string;
  marker: string;
  url: string;
}

export interface ReleaseState {
  initialized: boolean;
  lastSeenTag?: string;
  updatedAt: string;
}

export interface PostLike {
  authorId: string;
  footerTexts: readonly string[];
}

export interface ReleaseChannelStatus {
  channelName: string;
  state: 'ready' | 'missing' | 'no-access' | 'members-can-post';
  detail: string;
}

function httpsUrlUnderPrefix(value: string, prefix: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.href.startsWith(prefix);
  } catch {
    return false;
  }
}

export function isOfficialReleaseUrl(value: string): boolean {
  return httpsUrlUnderPrefix(value, releasePrefix);
}

export function isOfficialAssetUrl(value: string): boolean {
  return httpsUrlUnderPrefix(value, downloadPrefix);
}

/** Drafts and prereleases are never announced. */
export function stableReleases(releases: readonly GitHubRelease[]): GitHubRelease[] {
  return releases.filter((release) => release && !release.draft && !release.prerelease && release.tag_name);
}

export function releaseMarker(tag: string, kind: ReleasePostKind): string {
  return `kuro-release:${tag}:${kind}:v${RELEASE_POST_VERSION}`;
}

export function releaseFooter(tag: string, kind: ReleasePostKind): string {
  return `Kuro TV release · ${tag} · ${releaseMarker(tag, kind)}`;
}

export interface ReleaseAssets {
  apkUrl?: string;
  checksumUrl?: string;
}

/** Only official GitHub release assets are returned; mirrors are ignored. */
export function findReleaseAssets(release: GitHubRelease): ReleaseAssets {
  const assets = (release.assets ?? []).filter((asset) => asset && isOfficialAssetUrl(asset.browser_download_url));
  const apk = assets.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
  if (!apk) return {};

  const checksum =
    assets.find(
      (asset) =>
        asset.name.toLowerCase().endsWith('.sha256') &&
        asset.name.toLowerCase().startsWith(apk.name.toLowerCase()),
    ) ?? assets.find((asset) => asset.name.toLowerCase().endsWith('.apk.sha256'));

  return {
    apkUrl: apk.browser_download_url,
    checksumUrl: checksum?.browser_download_url,
  };
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\r\n/g, '\n').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Builds at most two posts: release notes and a separate APK/checksum post. */
export function buildReleasePosts(release: GitHubRelease): ReleasePost[] {
  if (!isOfficialReleaseUrl(release.html_url)) {
    throw new Error('Release URL is not an official Kuro-tv-Releases GitHub URL.');
  }

  const label = release.name?.trim() || `Kuro TV ${release.tag_name}`;
  const notes: ReleasePost = {
    key: 'notes',
    channelName: 'release-notes',
    title: `${label} — release notes`,
    content: [
      `**${label}** (${release.tag_name})`,
      '',
      clip(release.body ?? 'Official release notes are available on GitHub.', 1600),
      '',
      `Official release: ${release.html_url}`,
    ].join('\n'),
    marker: releaseMarker(release.tag_name, 'notes'),
    url: release.html_url,
  };

  const { apkUrl, checksumUrl } = findReleaseAssets(release);
  if (!apkUrl) return [notes];

  const apk: ReleasePost = {
    key: 'apk',
    channelName: 'android-releases',
    title: `${label} — APK & checksum`,
    content: [
      `**${label} (${release.tag_name})** for Android.`,
      '',
      'Kuro is an open-source media player/front-end. It does not host, upload, or provide media streams.',
      '',
      '• APK: official signed release asset from GitHub',
      ...(checksumUrl ? ['• SHA-256 companion: official checksum asset from GitHub'] : []),
      `• Release notes and assets: ${release.html_url}`,
      '',
      `APK asset: ${apkUrl}`,
      ...(checksumUrl ? [`Checksum asset: ${checksumUrl}`] : []),
    ].join('\n'),
    marker: releaseMarker(release.tag_name, 'apk'),
    url: apkUrl,
  };

  return [notes, apk];
}

/** Releases published after the last seen tag, oldest first. */
export function releasesNewerThan(
  releases: readonly GitHubRelease[],
  lastSeenTag: string | undefined,
): GitHubRelease[] {
  if (!lastSeenTag) return [];
  const index = releases.findIndex((release) => release.tag_name === lastSeenTag);
  if (index <= 0) return [];
  return [...releases.slice(0, index)].reverse();
}

/**
 * First run (or lost state) only establishes a baseline; the release that
 * already exists must be published through the owner-confirmed command.
 */
export function shouldAutoPublish(
  latestTag: string | undefined,
  state: Pick<ReleaseState, 'initialized' | 'lastSeenTag'>,
): boolean {
  return Boolean(state.initialized && state.lastSeenTag && latestTag && state.lastSeenTag !== latestTag);
}

export function releaseAlreadyPosted(
  posts: readonly PostLike[],
  botUserId: string,
  marker: string,
): boolean {
  return posts.some(
    (post) => post.authorId === botUserId && post.footerTexts.some((text) => text.includes(marker)),
  );
}
