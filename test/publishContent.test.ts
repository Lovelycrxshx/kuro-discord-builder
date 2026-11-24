import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PUBLISH_CONTENT,
  alreadyPosted,
  buildPublishPreview,
  contentFooter,
  contentMarker,
  isServerOwner,
  pendingContent,
  resolveContentChannels,
  validPublishPhrase,
} from '../src/content/publishContent.js';
import { ConfirmationService } from '../src/services/confirmationService.js';

test('preview covers the four starter messages and stays read-only', () => {
  const { embeds, files } = buildPublishPreview();

  assert.equal(embeds.length, 4);
  assert.deepEqual(
    embeds.map((embed) => embed.data.title),
    ['Preview · #welcome', 'Preview · #rules', 'Preview · #server-guide', 'Preview · #announcements'],
  );
  assert.equal(files[0]?.name, 'kuro-content-preview.md');

  const allContent = PUBLISH_CONTENT.map((item) => item.content).join('\n');
  assert.ok(allContent.includes('does not host, upload, or provide media streams'));
  assert.ok(!allContent.includes('@everyone'));

  for (const item of PUBLISH_CONTENT) assert.ok(item.content.length < 4096, `${item.key} too long for an embed`);
  for (const embed of embeds) {
    assert.ok((embed.data.description?.length ?? 0) <= 900);
    assert.ok(embed.data.footer?.text?.includes('Preview only'));
  }
});

test('rules are exactly 10 numbered items covering required topics', () => {
  const rules = PUBLISH_CONTENT.find((item) => item.key === 'rules');
  assert.ok(rules);

  const lines = rules.content.split('\n').filter((line) => /^\d+\./.test(line));
  assert.deepEqual(
    lines.map((line) => Number(line.match(/^(\d+)\./)?.[1])),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );

  for (const topic of [
    'correct channel',
    'No spam or scams',
    'No piracy or stream links',
    'official APK links only',
    'credentials and privacy',
    'Sanitize logs',
    'Mark spoilers',
    'unsolicited DMs',
    'Terms of Service',
    'moderator instructions',
    'does not host media',
  ]) {
    assert.ok(rules.content.toLowerCase().includes(topic.toLowerCase()), `missing rule topic: ${topic}`);
  }
});

test('owner confirmation is restricted to the server owner and exact PUBLISH phrase', () => {
  assert.equal(isServerOwner('owner-1', 'owner-1'), true);
  assert.equal(isServerOwner('member-1', 'owner-1'), false);
  assert.equal(validPublishPhrase('PUBLISH'), true);
  assert.equal(validPublishPhrase(' publish '), true);
  assert.equal(validPublishPhrase('APPLY'), false);
  assert.equal(validPublishPhrase('publish please'), false);
});

test('publish and release requests are distinct from apply requests', () => {
  const service = new ConfirmationService();
  const applyRequest = service.create({
    kind: 'apply',
    guildId: 'guild-1',
    channelId: 'channel-1',
    requesterId: 'user-1',
  });
  const publishRequest = service.create({
    kind: 'publish',
    guildId: 'guild-1',
    channelId: 'channel-1',
    requesterId: 'user-1',
  });
  const releaseRequest = service.create({
    kind: 'release',
    guildId: 'guild-1',
    channelId: 'channel-1',
    requesterId: 'user-1',
  });

  assert.equal(service.getActiveForGuild('guild-1', 'apply')?.id, applyRequest.id);
  assert.equal(service.getActiveForGuild('guild-1', 'publish')?.id, publishRequest.id);
  assert.equal(service.getActiveForGuild('guild-1', 'release')?.id, releaseRequest.id);
});

test('missing channels are reported without adding new targets', () => {
  const resolved = resolveContentChannels([
    { name: 'welcome' },
    { name: 'rules' },
    { name: 'announcements' },
  ]);

  assert.equal(resolved.length, 4);
  assert.deepEqual(
    resolved.filter((entry) => entry.state === 'missing').map((entry) => entry.item.key),
    ['serverGuide'],
  );
  assert.deepEqual(
    resolved.filter((entry) => entry.state === 'ready').map((entry) => entry.item.key),
    ['welcome', 'rules', 'announcements'],
  );
});

test('retries skip messages the bot already posted', () => {
  const posts = [
    { authorId: 'bot-1', footerTexts: [contentFooter('welcome')] },
    { authorId: 'member-1', footerTexts: [contentFooter('rules')] },
  ];

  assert.equal(alreadyPosted(posts, 'bot-1', 'welcome'), true);
  assert.equal(alreadyPosted(posts, 'bot-1', 'rules'), false, 'other authors must not count as bot posts');

  const remaining = pendingContent(PUBLISH_CONTENT, new Set([contentMarker('welcome')]));
  assert.deepEqual(
    remaining.map((item) => item.key),
    ['rules', 'serverGuide', 'announcements'],
  );
});
