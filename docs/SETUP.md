# Local setup

## 1. Prerequisites

- Node.js **20.11+** (Node 22 recommended; this matches `engines` in `package.json`)
- npm
- A Discord server you own, for testing
- A Discord application/bot in the [Discord Developer Portal](https://discord.com/developers/applications)

No privileged Gateway intents are needed. Leave **Message Content Intent**, **Presence Intent**, and **Server Members Intent** off — the bot only handles interactions.

## 2. Create the bot

1. Open the Developer Portal → **New Application** → name it (for example, `Kuro Builder`).
2. Copy the **Application ID** — this is `DISCORD_CLIENT_ID`.
3. Go to **Bot** → **Reset Token** → copy the token — this is `DISCORD_TOKEN`.

Treat the token like a password. If it leaks, reset it immediately. Never paste it into a file that gets committed, a screenshot, or a chat message. This repository's `.gitignore` excludes `.env`, and `.env.example` contains placeholders only.

## 3. Invite with minimum permissions

In **OAuth2 → URL Generator**, select scopes:

- `bot`
- `applications.commands`

### Runtime permissions for the BOT (OAuth2 invite)

Select exactly these permissions:

- Manage Channels
- Manage Roles
- View Channel
- Send Messages
- Embed Links
- Read Message History
- Add Reactions

**Never select** Administrator, Kick Members, Ban Members, Manage Guild, or Mention Everyone. The bot does not use them. If they are already present, `/apply` logs a warning naming them and proceeds without using them — remove them from the bot role to restore least privilege.

### Role hierarchy requirement

Open the generated invite URL, add the bot to your test server, then go to **Server Settings → Roles**:

1. Drag the bot's role **above @everyone** and above every role it will create or reuse.
2. Discord will not let the bot create or assign roles at or above its own highest role.
3. If the bot's highest role is `@everyone`, `/apply` stops with a clear error before creating anything.

### Permissions assigned to GENERATED roles

These are a separate set. Generated roles may only use viewing/reading, messaging, threads, embeds, attachments, reactions, `Manage Messages` (moderators), and voice connect/speak. **No generated role gets Manage Channels or Manage Roles** — including the honorary "Kuro Admin" role. See [SERVER-PRESET.md](SERVER-PRESET.md#bot-runtime-permissions-vs-generated-role-permissions).

## 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
DISCORD_TOKEN=replace_with_your_bot_token
DISCORD_CLIENT_ID=replace_with_your_application_id
DISCORD_GUILD_ID=replace_with_your_test_server_id
LOG_CHANNEL_ID=
PORT=3000
ACTION_LOG_PATH=data/actions.jsonl
```

`DISCORD_GUILD_ID` is optional but recommended for local testing: it registers commands to one server instantly. Leave it blank to register global commands (Discord may cache those for up to an hour).

`LOG_CHANNEL_ID` is optional. If set, the bot mirrors apply summaries to that channel; it needs View Channel, Send Messages, and Embed Links there.

## 5. Install, check, register, run

```bash
npm ci
npm run check:plan
npm run typecheck
npm run register
npm run dev
```

`npm run register` overwrites this application's command definitions with the three commands in this repo. Run it again whenever command names/options change. It does not join servers or read messages.

Wait for the log line `bot.ready`, then test in your server:

1. `/plan` — confirm three ephemeral embeds: 9 categories/38 channels, 12 generated roles, and the permission model. A `kuro-server-plan.json` attachment is included. Nothing is created.
2. `/apply` — as a non-owner with Manage Server, confirm a public confirmation message pings the owner. No categories, channels, or roles are created yet.
3. As the **server owner**, press **Confirm as owner** on that message (or on your own ephemeral `/apply` reply) and type `APPLY` in the modal.
4. Review the result embed and the JSON lines in stdout / `data/actions.jsonl`.
5. Run `/apply` a second time. Existing names are skipped, not duplicated or edited.
6. `/release-template version:1.5.5` — confirm the rich 1.5.5 highlights, verified GitHub buttons, official `.sha256` link, and that nothing is posted. Add `highlights:` to override the preset.
7. `/publish-content` — confirm five previews and the status of each target channel. As owner, press **Confirm as owner** and type `PUBLISH`. Run it again to verify already-posted messages are skipped. See [PUBLISH-CONTENT.md](PUBLISH-CONTENT.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Slash commands do not appear | Set `DISCORD_GUILD_ID` to your test server ID and re-run `npm run register`; global commands can take up to an hour. |
| `Bot is missing required permissions` | Re-invite with the exact permissions listed above, or grant them in Server Settings → Integrations → your bot. |
| `Bot needs a role above @everyone` | Move the bot's role higher in Server Settings → Roles. |
| `Missing required environment variable` | Check that `.env` exists next to `package.json` and has no extra spaces around the `=` signs. |
| A channel/role was skipped | That name already exists. The bot deliberately leaves it untouched; rename the existing one manually if you want the plan's version created. |
| Confirmation says expired | Requests last 10 minutes. Run `/apply` again. |
| Warning listing over-granted bot permissions | Remove Administrator / Kick / Ban / Manage Guild / Mention Everyone from the bot role. The builder does not use them. |

## What the bot never does

- No message/content scanning, no automated moderation, no member sanctions.
- No deletion, renaming, or permission edits on existing channels, categories, or roles.
- No global `@everyone` permission changes.
- No posting of release announcements; `/release-template` is a preview only.
- No persistence of bot tokens anywhere except the environment.
