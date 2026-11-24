/** Pure validators shared by startup config and tests. Values are never logged. */

const snowflakePattern = /^\d{17,20}$/;
const discordTokenPattern = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}$/;

export function isDiscordSnowflake(value: string): boolean {
  return snowflakePattern.test(value);
}

/**
 * Discord bot tokens are three dot-separated base64url-ish segments.
 * This rejects obvious placeholders before a login attempt produces a vague
 * "application did not respond" in Discord.
 */
export function looksLikeDiscordBotToken(value: string): boolean {
  return discordTokenPattern.test(value);
}
