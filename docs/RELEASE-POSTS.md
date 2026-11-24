# Release posts and monitoring

Release content is handled in two ways: automatic polling for **new** stable releases, and an owner-confirmed command for publishing the release that already exists.

No channel, category, role, or permission is created or changed by this feature.

## Channels

| Channel | Post |
| --- | --- |
| `#release-notes` | Release notes from the official GitHub release body, with the official release URL. |
| `#android-releases` | Separate APK/checksum post using only official GitHub release assets. |

Both must already exist. Missing channels, missing bot access, or channels where ordinary members can post are skipped and reported. The bot never edits, deletes, or pins messages and sends with empty allowed mentions, so there is no `@everyone` ping.

## `/publish-release`

1. Run `/publish-release` (Manage Server required; owner always allowed).
2. The bot fetches the latest **stable, non-draft, non-prerelease** release from `Lovelycrxshx/Kuro-tv-Releases` and shows ephemeral previews plus a `kuro-release-preview.md` attachment.
3. The server owner presses **Confirm as owner** and types `PUBLISH`.
4. The bot re-fetches the current latest stable release at confirmation time, then posts to `#release-notes` and `#android-releases`.

This is the intended way to publish the already-existing latest release after setup. Automatic monitoring deliberately does **not** post it on first startup.

## Automatic monitoring

- Polls `https://api.github.com/repos/Lovelycrxshx/Kuro-tv-Releases/releases`.
- Default interval: 15 minutes (`RELEASE_POLL_INTERVAL_MS`, minimum 60,000 ms).
- Drafts and prereleases are ignored.
- On first startup with no state file, the bot records the current stable tag as a baseline and posts nothing.
- On later polls, only releases newer than the last seen tag are posted, oldest first.
- The last seen tag is stored in `RELEASE_STATE_PATH` (default `data/release-state.json`). Railway's filesystem is ephemeral; after a redeploy with no state file, the bot establishes a fresh baseline and posts nothing instead of spamming an old release.
- Embed-footer markers such as `kuro-release:v1.5.5:notes:v1.0.0` provide a second layer of duplicate protection from recent Discord history.

If `DISCORD_GUILD_ID` is set, automatic posts go only to that server. If it is blank, the bot posts to every cached guild — leave it set when running multiple servers.

## Official links only

`buildReleasePosts()` validates that:

- the release `html_url` is under `https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/`;
- APK and `.sha256` assets come from that release's official `/releases/download/` URLs.

Mirror URLs are ignored. No checksum value is invented; the official checksum asset is linked instead.

## Configuration

No new channel or role IDs are required: exact channel names are used. New optional variables in `.env.example`:

- `WELCOME_MENTION_USER_ID` — optional fixed staff mention for join welcomes.
- `RELEASE_POLL_INTERVAL_MS` — polling interval in milliseconds.
- `RELEASE_STATE_PATH` — local JSON file for the last seen release tag.

## Tests

`npm test` covers stable-release filtering, official URL validation, asset selection, two-post generation with unique markers, first-run baseline behavior, release ordering, and duplicate detection.
