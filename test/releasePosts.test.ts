import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReleasePosts,
  findReleaseAssets,
  isOfficialAssetUrl,
  isOfficialReleaseUrl,
  releaseAlreadyPosted,
  releaseMarker,
  releasesNewerThan,
  shouldAutoPublish,
  stableReleases,
  type GitHubRelease,
} from '../src/content/releasePosts.js';

const releasePrefix = 'https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/';
const apkUrl = `${releasePrefix}download/v1.5.5/Kuro-tv-1.5.5.apk`;
const checksumUrl = `${apkUrl}.sha256`;

function fakeRelease(overrides: Partial<GitHubRelease> = {}): GitHubRelease {
  return {
    tag_name: 'v1.5.5',
    name: 'Kuro 1.5.5',
    body: 'Profile Art Studio and CSP-safe banner rendering.',
    html_url: `${releasePrefix}tag/v1.5.5`,
    published_at: '2026-11-24T10:35:14Z',
    draft: false,
    prerelease: false,
    assets: [
      { name: 'Kuro-tv-1.5.5.apk', browser_download_url: apkUrl },
      { name: 'Kuro-tv-1.5.5.apk.sha256', browser_download_url: checksumUrl },
    ],
    ...overrides,
  };
}

test('only stable, non-draft releases are selected', () => {
  const releases = [
    fakeRelease({ tag_name: 'v1.5.5' }),
    fakeRelease({ tag_name: 'v1.5.6-beta', prerelease: true }),
    fakeRelease({ tag_name: 'v1.5.7-draft', draft: true }),
  ];
  assert.deepEqual(stableReleases(releases).map((release) => release.tag_name), ['v1.5.5']);
});

test('release posts use only official GitHub URLs and carry unique markers', () => {
  const release = fakeRelease();
  const posts = buildReleasePosts(release);

  assert.deepEqual(posts.map((post) => post.key), ['notes', 'apk']);
  assert.deepEqual(posts.map((post) => post.channelName), ['release-notes', 'android-releases']);
  assert.notEqual(posts[0]?.marker, posts[1]?.marker);
  for (const post of posts) {
    assert.ok(isOfficialReleaseUrl(post.url));
    assert.ok(!post.content.includes('@everyone'));
    assert.ok(post.content.includes(release.html_url));
  }
  assert.ok(posts[1]?.content.includes(apkUrl));
  assert.ok(posts[1]?.content.includes(checksumUrl));
  assert.ok(!posts[1]?.content.includes('lovelycrxshx.github.io'));
});

test('unofficial assets are ignored', () => {
  const release = fakeRelease({
    assets: [
      { name: 'Kuro-tv-1.5.5.apk', browser_download_url: 'https://mirror.example.com/Kuro.apk' },
      { name: 'Kuro-tv-1.5.5.apk', browser_download_url: apkUrl },
    ],
  });
  assert.equal(isOfficialAssetUrl('https://mirror.example.com/Kuro.apk'), false);
  assert.deepEqual(findReleaseAssets(release), { apkUrl, checksumUrl: undefined });
});

test('first startup establishes a baseline and does not auto-post an old release', () => {
  assert.equal(shouldAutoPublish('v1.5.5', { initialized: false }), false);
  assert.equal(shouldAutoPublish('v1.5.5', { initialized: true, lastSeenTag: 'v1.5.5' }), false);
  assert.equal(shouldAutoPublish('v1.5.6', { initialized: true, lastSeenTag: 'v1.5.5' }), true);
});

test('new releases are returned oldest first after the last seen tag', () => {
  const releases = [
    fakeRelease({ tag_name: 'v1.5.7' }),
    fakeRelease({ tag_name: 'v1.5.6' }),
    fakeRelease({ tag_name: 'v1.5.5' }),
  ];
  assert.deepEqual(releasesNewerThan(releases, 'v1.5.5').map((release) => release.tag_name), [
    'v1.5.6',
    'v1.5.7',
  ]);
  assert.deepEqual(releasesNewerThan(releases, undefined), []);
});

test('duplicate release posts are detected by marker and bot author', () => {
  const marker = releaseMarker('v1.5.5', 'notes');
  const posts = [
    { authorId: 'bot-1', footerTexts: [`Kuro TV release · v1.5.5 · ${marker}`] },
    { authorId: 'member-1', footerTexts: [`Kuro TV release · v1.5.5 · ${marker}`] },
  ];
  assert.equal(releaseAlreadyPosted(posts, 'bot-1', marker), true);
  assert.equal(releaseAlreadyPosted(posts, 'other-bot', marker), false);
});
