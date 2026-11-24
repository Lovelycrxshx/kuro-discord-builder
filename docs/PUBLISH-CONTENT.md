# `/publish-content`

Posts the standard Kuro TV community messages to an existing server. Preview-first, owner-confirmed, additive-only.

## Flow

1. Run `/publish-content` (Manage Server required; the server owner always has access).
2. The bot replies with **five ephemeral previews** for `#welcome`, `#rules`, `#server-guide`, `#announcements`, and `#android-releases`, plus a `kuro-content-preview.md` attachment with the full text and a live status for each channel.
3. Nothing is posted yet. The server owner presses **Confirm as owner** and types `PUBLISH` in the modal.
4. The bot posts only to channels that exist and that it can view, read history in, and send to. Missing or unsafe channels are skipped and reported in the result embed and audit log.

A non-owner requester produces a public confirmation message that pings the owner; the owner-run version stays ephemeral. The typed phrase is owner-only in both cases.

## Message content

| Channel | Content |
| --- | --- |
| `#welcome` | Friendly greeting, what Kuro is, and pointers to rules, guide, support, and downloads. |
| `#rules` | Respect, spoilers, no piracy or stream links, official APK links only, no passwords/tokens/private URLs/personal details. |
| `#server-guide` | Category map, device/notification/event/beta roles, and templates for useful help requests and bug reports. |
| `#announcements` | Truthful channel introduction saying project updates will be shared here; no invented news. |
| `#android-releases` | Rich Kuro 1.5.5 Android release post using only `RELEASE-1.5.5.md` details and the verified links below. |

Kuro is described accurately as an **open-source media player/front-end** that does **not** host, upload, or provide media streams. Catalogue sources run locally on the user's device.

Verified 1.5.5 links used in the post:

- APK: <https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/download/v1.5.5/Kuro-tv-1.5.5.apk>
- Release notes: <https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/tag/v1.5.5>
- Download page: <https://lovelycrxshx.github.io/Kuro-tv-Releases/>
- SHA-256: <https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/download/v1.5.5/Kuro-tv-1.5.5.apk.sha256>

No checksum value is invented; the official `.sha256` companion is linked instead.

## Safety rules

- **Never edits or deletes existing messages.** The command only calls `channel.send()`.
- **Never pins messages** and never requests extra permissions for pinning.
- **No `@everyone` or role pings.** Sends use `allowedMentions: { parse: [] }`, and the content contains no mass mentions.
- **No channel or permission changes.** The bot will not create `#server-guide`, fix overwrites, or grant itself access.
- **Post only to exact existing channel names.** If a target is missing, it is skipped and reported. The current preset uses `#community-guide`, so `#server-guide` must be created or renamed manually if your server does not already have it.
- **Announcement/release channels stay read-only for members.** The bot skips `#announcements` and `#android-releases` if ordinary members have `Send Messages` there. It reports the issue rather than changing permissions. The owner must ensure the *existing bot role* has `View Channel`, `Read Message History`, and `Send Messages` in those channels.
- **Role hierarchy still applies:** the bot role must sit above `@everyone` and above roles it creates. See [SETUP.md](SETUP.md#3-invite-with-minimum-permissions).

## Retry safety

Every posted message carries an embed footer marker such as `kuro-content:welcome:v1.0.0`. Before posting, the bot scans the most recent 100 messages in that channel for a message by itself with that marker. If found, the channel is skipped as a duplicate.

This survives bot restarts because the source of truth is Discord history, not local memory. The scan covers the latest 100 messages per channel; older marked posts beyond that window would not be detected.

## Tests

`npm test` covers:

- preview target list, official links, content accuracy, and absence of `@everyone`;
- owner-only confirmation and exact `PUBLISH` phrase;
- missing-channel resolution and reporting;
- duplicate detection by marker/author and retry filtering.
