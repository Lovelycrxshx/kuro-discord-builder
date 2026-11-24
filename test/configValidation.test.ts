import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDiscordSnowflake,
  looksLikeDiscordBotToken,
} from '../src/utils/configValidation.js';

test('placeholder credentials are rejected before startup', () => {
  assert.equal(looksLikeDiscordBotToken('replace_with_your_bot_token'), false);
  assert.equal(looksLikeDiscordBotToken(''), false);
  assert.equal(isDiscordSnowflake('replace_with_your_application_id'), false);
  assert.equal(isDiscordSnowflake('123'), false);
});

test('well-formed Discord credentials pass validation', () => {
  const token = ['a'.repeat(24), 'b'.repeat(6), 'c'.repeat(27)].join('.');
  assert.equal(looksLikeDiscordBotToken(token), true);
  assert.equal(isDiscordSnowflake('123456789012345678'), true);
});
