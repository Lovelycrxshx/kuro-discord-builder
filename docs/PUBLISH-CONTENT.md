# `/publish-content`

Posts the standard Kuro TV community messages to an existing server. Preview-first, owner-confirmed, additive-only. This command never creates, renames, or deletes channels or roles.

## Flow

1. Run `/publish-content` (Manage Server required; the server owner always has access).
2. The bot replies with **four ephemeral previews** for `#welcome`, `#rules`, `#server-guide`, and `#announcements`, plus a `kuro-content-preview.md` attachment with the full text and a live status for each channel.
3. Nothing is posted yet. The server owner presses **Confirm as owner** and types `PUBLISH` in the modal.
4. The bot posts only to channels that exist and that it can view, read history in, and send to. Missing or unsafe channels are skipped and reported in the result embed and audit log.

A non-owner requester produces a public confirmation message that pings the owner; the owner-run version stays ephemeral. The typed phrase is owner-only in both cases.

## Message content

| Channel | Content |
| --- | --- |
| `#welcome` | Friendly greeting, what Kuro is, and pointers to rules, the guide, support, and downloads. |
| `#rules` | **Exactly 10 numbered rules** covering respect, correct channel use, no spam/scams, no piracy or stream links, official APK links only, no credentials/private URLs, sanitized logs, spoilers, unsolicited DMs, Discord Terms of Service, and moderator instructions. States that Kuro TV is a player/front-end and does not host media. |
| `#server-guide` | Category map, device/notification/event/beta roles, and templates for useful help requests and bug reports. |
| `#announcements` | Truthful channel introduction saying project updates will be shared here; no invented news. |

Release posts are handled separately by `/publish-release` and the release monitor; see [RELEASE-POSTS.md](RELEASE-POSTS.md).

## Safety rules

- **Never edits or deletes existing messages.** The command only calls `channel.send()`.
- **Never pins messages** and never requests extra permissions for pinning.
- **No `@everyone` or role pings.** Sends use `allowedMentions: { parse: [] }`, and the content contains no mass mentions.
- **No channel or permission changes.** The bot will not create `#server-guide`, fix overwrites, or grant itself access.
- **Post only to exact existing channel names.** If a target is missing, it is skipped and reported. The current preset uses `#community-guide`, so `#server-guide` must already exist or be renamed manually.
- **Announcement channels stay read-only for members.** The bot skips `#announcements` if ordinary members have `Send Messages` there. It reports the issue rather than changing permissions.
- **Role hierarchy still applies:** the bot role must sit above `@everyone` and above roles it creates. See [SETUP.md](SETUP.md#3-invite-with-minimum-permissions).

## Retry safety

Every posted message carries an embed footer marker such as `kuro-content:welcome:v1.0.0`. Before posting, the bot scans the most recent 100 messages in that channel for a message by itself with that marker. If found, the channel is skipped as a duplicate.

This survives bot restarts because the source of truth is Discord history, not local memory. The scan covers the latest 100 messages per channel; older marked posts beyond that window would not be detected.

## Tests

`npm test` covers:

- four-message preview target list, content accuracy, and absence of `@everyone`;
- exactly 10 numbered rules with all required topics;
- owner-only confirmation and exact `PUBLISH` phrase;
- request-kind separation between apply, publish, and release;
- missing-channel resolution and reporting;
- duplicate detection by marker/author and retry filtering.
