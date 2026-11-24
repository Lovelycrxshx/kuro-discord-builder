import assert from 'node:assert/strict';
import test from 'node:test';
import { JOIN_WELCOMES, buildWelcomeMessage } from '../src/content/joinWelcomes.js';

test('join welcomes are a small prewritten set with a member placeholder', () => {
  assert.ok(JOIN_WELCOMES.length >= 3 && JOIN_WELCOMES.length <= 6);
  for (const template of JOIN_WELCOMES) {
    assert.ok(template.includes('{member}'));
    assert.ok(!template.includes('@everyone'));
  }
});

test('welcome mentions only the new member by default', () => {
  const welcome = buildWelcomeMessage('123456789012345678', undefined, 0);
  assert.ok(welcome.content.includes('<@123456789012345678>'));
  assert.ok(!welcome.content.includes('@everyone'));
  assert.deepEqual(welcome.mentionIds, ['123456789012345678']);
});

test('optional special user is mentioned alongside the new member', () => {
  const welcome = buildWelcomeMessage('111111111111111111', '222222222222222222', 1);
  assert.ok(welcome.content.includes('<@111111111111111111>'));
  assert.ok(welcome.content.includes('<@222222222222222222>'));
  assert.ok(!welcome.content.includes('@everyone'));
  assert.deepEqual(welcome.mentionIds, ['111111111111111111', '222222222222222222']);
});

test('duplicate mention IDs are removed', () => {
  const welcome = buildWelcomeMessage('111111111111111111', '111111111111111111', 2);
  assert.deepEqual(welcome.mentionIds, ['111111111111111111']);
});
