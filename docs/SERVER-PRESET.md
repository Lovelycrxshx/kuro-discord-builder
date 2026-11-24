# Server preset v2.0.0

`KURO_SERVER_PLAN` is the single canonical layout used by both `/plan` (preview) and `/apply` (additive creation).

**Counts:** 9 categories · 38 channels · 12 roles.

## Categories and channels

| Category | Channels |
| --- | --- |
| 📌 START HERE | #welcome, #rules, #faq, #community-guide |
| 📢 ANNOUNCEMENTS | #server-news, #maintenance, #event-news |
| 📦 DOWNLOADS & RELEASES | #android-releases, #release-notes, #release-discussion, #beta-releases, #checksum-help |
| 💬 COMMUNITY | #general, #introductions, #media, #recommendations, #anime-discussion, #suggestions, 🔊 lounge |
| 🆘 SUPPORT | #help, #bug-reports, #installation-help, #device-help, #feature-requests |
| 📺 DEVICE SELECTION | #android-tv, #fire-tv, #mobile, #remote-controls |
| 🎉 EVENTS | #event-chat, #watch-party, #polls |
| 🧑‍💻 DEVELOPMENT | #dev-chat, #translations, #beta-testing |
| 🔒 STAFF | #moderator-chat, #mod-log, #support-room, #release-staging |

### Downloads & Releases specifics

- **#android-releases** is read-only for `@everyone` (`Send Messages`, `Attach Files`, `Add Reactions`, and thread creation are denied). Its topic points to the verified [latest release](https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases/latest). Moderators can post and pin official announcements there.
- **#release-discussion** is a public channel with normal read/write permissions for everyone.
- **#release-notes** links to the [official Releases page](https://github.com/Lovelycrxshx/Kuro-tv-Releases/releases).
- **#beta-releases** and **#beta-testing** deny `@everyone` visibility; Beta Testers and Developers get explicit allows.

## Generated roles

| Role | Permissions | Purpose |
| --- | --- | --- |
| Kuro Admin | Basic chat only | Honorary lead/coordination role. **No Administrator and no management permissions.** |
| Kuro Moderator | `Manage Messages` + chat | Cleans messages and accesses STAFF. No Kick/Ban. |
| Kuro Support Helper | Chat + attachments | Answers in support channels and the private support room. |
| Kuro Developer | Chat + attachments | Shares builds and feedback in development channels. |
| Kuro Contributor | None | Recognition role; can post in #translations via channel overwrite. |
| Kuro Beta Tester | None | Access to beta areas via channel overwrites. |
| Kuro Member | Standard chat/voice | Baseline community role without global `View Channel`. |
| Kuro Release Alerts | None | Opt-in release audience; no posting or automatic pings. |
| Kuro Event Goer | None | Opt-in event audience; can react in event channels. |
| Kuro Android TV | None | Can post in #android-tv. |
| Kuro Fire TV | None | Can post in #fire-tv. |
| Kuro Mobile | None | Can post in #mobile. |

**No generated role receives** Administrator, Manage Guild, Manage Roles, Manage Channels, Kick Members, Ban Members, or Mention Everyone. This is enforced by `assertPlanIsLeastPrivilege()` and by `npm run check:plan`.

The bot creates these roles but does **not** assign them to members or install a self-role menu. The owner can hand out roles manually or add a reaction-role bot separately.

Broad roles intentionally omit `View Channel`. `@everyone` provides normal visibility; private channels deny `@everyone` and grant narrow allows. Giving a broad role global `View Channel` would override those denies.

## Bot runtime permissions vs generated-role permissions

These are separate permission sets and must not be confused:

| | Bot runtime (OAuth2 invite) | Generated roles |
| --- | --- | --- |
| Needs `Manage Channels` / `Manage Roles` | **Yes** — to create the plan | **Never** |
| May use `Administrator`, `Kick/Ban`, `Manage Guild`, `Mention Everyone` | **No** — never select these on the invite | **Never** |
| Typical permissions | Manage Channels, Manage Roles, View Channel, Send Messages, Embed Links, Read Message History, Add Reactions | View Channel (narrow), Read Message History, Send Messages, threads, Embed Links, Attach Files, Add Reactions, Manage Messages (moderators only), Connect, Speak |

If the bot is over-permissioned, `/apply` still refuses to use the extra permissions and logs a warning listing them. Remove them from the bot role to restore least privilege.

## Role hierarchy requirement

Discord will not let a bot create or assign roles at or above its own highest role. Therefore:

1. The bot role must be **above @everyone** and above every role it creates or reuses.
2. Move the bot role up in **Server Settings → Roles** after inviting it.
3. If the bot's highest role is @everyone, `/apply` stops with a clear error before creating anything.
4. Existing roles named like the plan's roles are only reused when they sit below the bot's highest role and have exactly the expected safe permissions.

## Apply behaviour

- `/plan` is preview-only and attaches the full plan as `kuro-server-plan.json`.
- `/apply` requires the server owner's button **and** typed `APPLY`.
- Apply is additive: it creates only missing roles/categories/channels and never edits, renames, moves, or deletes existing resources.
- Every action, skip, refusal, and warning is logged as structured JSON.
