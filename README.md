# Kuro TV Discord Builder

A small, Railway-ready Discord server-builder bot for Kuro TV communities. Built with Node.js, TypeScript, and discord.js v14.

> **Status:** code and documentation only. No bot token is included, nothing has been deployed, and no Discord server has been modified. No PR has been opened.

## What it does

| Command | Who can use it | Behaviour |
| --- | --- | --- |
| `/plan` | Everyone in the server | Ephemeral, preview-only layout: 3 embeds covering 9 categories, 38 channels, 12 roles, and the permission model, plus a machine-readable `kuro-server-plan.json` attachment. **No changes.** |
| `/apply` | Members with Manage Server (owner always allowed) | Opens an owner-only confirmation flow. The server owner must press **Confirm as owner** and type `APPLY` in a modal before anything is created. |
| `/release-template version:1.5.5` | Everyone in the server | Ephemeral preview of the rich, verified Kuro 1.5.5 announcement. **Posts nothing.** Other versions render a generic template. |

If a non-owner with Manage Server runs `/apply`, the confirmation message is posted in the current channel so the owner can actually see and press it; the owner is pinged. If the owner runs it, the confirmation stays ephemeral. Either way, the typed `APPLY` modal is owner-only.

## Current preset: v2.0.0

**9 categories · 38 channels · 12 roles.** Full details in [SERVER-PRESET.md](docs/SERVER-PRESET.md).

Categories: 📌 START HERE, 📢 ANNOUNCEMENTS, 📦 DOWNLOADS & RELEASES, 💬 COMMUNITY, 🆘 SUPPORT, 📺 DEVICE SELECTION, 🎉 EVENTS, 🧑‍💻 DEVELOPMENT, 🔒 STAFF.

Roles: Kuro Admin, Moderator, Support Helper, Developer, Contributor, Beta Tester, Member, Release Alerts, Event Goer, Android TV, Fire TV, Mobile.

📦 **DOWNLOADS & RELEASES** contains a read-only **#android-releases** feed pointing at the official GitHub releases, a public **#release-discussion** channel, plus #release-notes, #beta-releases, and #checksum-help.

## Safety model

- **Preview-only / owner-confirmed / additive-only.** `/plan` changes nothing. `/apply` alone changes nothing: the button only works for `guild.ownerId`, the typed `APPLY` must match exactly, requests expire after 10 minutes, and they cannot be replayed. Apply only creates missing resources; it never edits, renames, moves, or deletes anything.
- **Fail-closed permissions.** `assertPlanIsLeastPrivilege()` rejects Administrator, Manage Guild, Manage Roles, Manage Channels, Kick/Ban, Mention Everyone, and other management permissions before any API call. `npm run check:plan` enforces the same rules in CI.
- **Bot runtime permissions are separate from generated-role permissions.** The bot requests only Manage Channels, Manage Roles, View Channel, Send Messages, Embed Links, Read Message History, and Add Reactions. It must never request Administrator, Kick/Ban, Manage Guild, or Mention Everyone. Generated roles never receive Manage Channels or Manage Roles — including the honorary "Kuro Admin" role, which has no Administrator rights.
- **Role hierarchy is required.** The bot role must sit above `@everyone` and above every role it creates or reuses. If its highest role is `@everyone`, `/apply` refuses to start. See [SETUP.md](docs/SETUP.md#3-invite-with-minimum-permissions).
- **Private areas stay private.** STAFF, #beta-releases, and #beta-testing deny `@everyone` visibility; broad roles deliberately omit global `View Channel` so they cannot override those denies.
- **Idempotent by name.** Existing roles/channels are skipped and logged, never modified. Existing roles are reused only when their permissions match and they sit below the bot's highest role.
- **Audited.** Every request, confirmation, creation, skip, refusal, and failure is written as structured JSON to stdout and to an append-only JSONL file. An optional Discord log channel can mirror summaries.

## Kuro TV release announcement

The rich 1.5.5 preset is built from the official [RELEASE-1.5.5.md](https://github.com/Lovelycrxshx/Kuro-tv-Releases/blob/main/RELEASE-1.5.5.md) notes: Profile Art Studio, CSP-safe avatars/banners, YouTube-style Watch page, Cinematic Title Detail v2, DoH + 8-lane catalog engine, 40 profile art sets, AniList/MAL sync, and Discord Rich Presence hub. See [KURO-1.5.5-ANNOUNCEMENT.md](docs/KURO-1.5.5-ANNOUNCEMENT.md) for the copy-paste version.

Verified official links used by the template:

- Releases: <https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases>
- Latest release: <https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/latest>
- v1.5.5 release: <https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/tag/v1.5.5>
- Direct APK: <https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/download/v1.5.5/Kuro-tv-1.5.5.apk>
- Source repository: <https://github.com/Lovelycrxshx/Kuro-tv-Releases>
- Download page: <https://lovelycrxshx.github.io/Kuro-tv-Releases/>
- Server builder: <https://github.com/Lovelycrxshx/kuro-discord-builder>

Custom links are rejected unless they point under the official repository over HTTPS.

## Documentation

- [Local setup](docs/SETUP.md)
- [Server preset v2.0.0](docs/SERVER-PRESET.md)
- [Kuro 1.5.5 announcement](docs/KURO-1.5.5-ANNOUNCEMENT.md)
- [Railway deployment](docs/RAILWAY.md)

## Project layout

```text
src/
  commands/          slash command definitions
  plan/              canonical server plan, safety checks, preview embeds
  services/          owner confirmation, additive builder, audit mirroring
  templates/         Kuro TV release announcements incl. 1.5.5 preset
  links.ts           verified official Kuro TV URLs
  config.ts          environment validation (no secrets logged)
  interactions.ts    command/button/modal routing and error handling
  index.ts           bot login, health server, graceful shutdown
```

## Scripts

```bash
npm ci             # install locked dependencies
npm run check:plan # print preset summary; fail on unsafe permissions
npm run typecheck  # strict TypeScript check
npm run build      # compile to dist/
npm run register   # register slash commands (needs real env values)
npm run dev        # local run with tsx watch
npm run start      # run compiled build
```

No `.env` file is committed. Copy `.env.example` and replace its placeholders locally or set the variables in Railway.
