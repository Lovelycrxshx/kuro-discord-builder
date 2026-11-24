import { PermissionFlagsBits } from 'discord.js';
import { KURO_OFFICIAL_LINKS } from '../links.js';
import {
  DANGEROUS_PERMISSION_NAMES,
  FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES,
  isSafePermission,
  permissionBits,
  type PermissionName,
  type SafePermission,
} from '../utils/permissions.js';

export type RoleKey =
  | 'admin'
  | 'moderator'
  | 'supportHelper'
  | 'developer'
  | 'contributor'
  | 'betaTester'
  | 'member'
  | 'releaseAlerts'
  | 'events'
  | 'deviceAndroidTv'
  | 'deviceFireTv'
  | 'deviceMobile';

export type CategoryKey =
  | 'startHere'
  | 'announcements'
  | 'downloadsReleases'
  | 'community'
  | 'support'
  | 'devices'
  | 'events'
  | 'development'
  | 'staff';

export interface OverwriteDefinition {
  target: { kind: 'everyone' } | { kind: 'role'; role: RoleKey };
  allow?: readonly SafePermission[];
  deny?: readonly SafePermission[];
}

export interface RoleDefinition {
  key: RoleKey;
  name: string;
  color: number;
  purpose: string;
  permissions: readonly SafePermission[];
}

export interface CategoryDefinition {
  key: CategoryKey;
  name: string;
  overwrites?: readonly OverwriteDefinition[];
}

export interface ChannelDefinition {
  key: string;
  name: string;
  type: 'text' | 'voice';
  category: CategoryKey;
  topic?: string;
  overwrites?: readonly OverwriteDefinition[];
}

export interface ServerPlan {
  id: string;
  version: string;
  summary: string;
  roles: readonly RoleDefinition[];
  categories: readonly CategoryDefinition[];
  channels: readonly ChannelDefinition[];
}

const everyone = { kind: 'everyone' } as const;
const role = (key: RoleKey) => ({ kind: 'role', role: key }) as const;

const readOnly: readonly SafePermission[] = ['ViewChannel', 'ReadMessageHistory'];
const communityReadWrite: readonly SafePermission[] = [
  'ViewChannel',
  'ReadMessageHistory',
  'SendMessages',
  'SendMessagesInThreads',
  'EmbedLinks',
  'AttachFiles',
  'AddReactions',
];
const staffWrite: readonly SafePermission[] = [
  'ViewChannel',
  'ReadMessageHistory',
  'SendMessages',
  'EmbedLinks',
  'AttachFiles',
  'AddReactions',
  'ManageMessages',
];
const readOnlyDenials: readonly SafePermission[] = [
  'SendMessages',
  'SendMessagesInThreads',
  'CreatePublicThreads',
  'AddReactions',
  'AttachFiles',
];
const announcementDenials: readonly SafePermission[] = [
  'SendMessages',
  'SendMessagesInThreads',
  'CreatePublicThreads',
  'AddReactions',
];

/**
 * Canonical Kuro TV community layout.
 *
 * Important: generated roles deliberately do NOT get ViewChannel globally.
 * @everyone supplies normal channel visibility, and STAFF/beta-only channels
 * deny @everyone ViewChannel. If a broad role had global ViewChannel it would
 * override those denies and expose private areas.
 */
export const KURO_SERVER_PLAN: ServerPlan = {
  id: 'kuro-community-rich',
  version: '2.0.0',
  summary:
    'A 9-category Kuro TV hub with 38 channels, 12 least-privilege roles, a read-only official release feed, and private staff/beta areas.',
  roles: [
    {
      key: 'admin',
      name: 'Kuro Admin',
      color: 0x94a3b8,
      purpose: 'Honorary lead/coordination role. Intentionally has no Administrator or management permissions.',
      permissions: ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
    },
    {
      key: 'moderator',
      name: 'Kuro Moderator',
      color: 0x8b5cf6,
      purpose: 'Can clean messages and use the STAFF area. No kick, ban, or server-management powers.',
      permissions: [
        'ViewChannel',
        'ReadMessageHistory',
        'SendMessages',
        'SendMessagesInThreads',
        'EmbedLinks',
        'AttachFiles',
        'AddReactions',
        'ManageMessages',
        'Connect',
        'Speak',
      ],
    },
    {
      key: 'supportHelper',
      name: 'Kuro Support Helper',
      color: 0x22d3ee,
      purpose: 'Can answer in support channels; cannot moderate members or change settings.',
      permissions: ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
    },
    {
      key: 'developer',
      name: 'Kuro Developer',
      color: 0x60a5fa,
      purpose: 'Can share code/builds in development channels; no repository or server management rights.',
      permissions: ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
    },
    {
      key: 'contributor',
      name: 'Kuro Contributor',
      color: 0xfbbf24,
      purpose: 'Recognition role for contributors; zero permissions.',
      permissions: [],
    },
    {
      key: 'betaTester',
      name: 'Kuro Beta Tester',
      color: 0xa78bfa,
      purpose: 'Opt-in testers can read beta news and post feedback in the beta testing channel.',
      permissions: [],
    },
    {
      key: 'member',
      name: 'Kuro Member',
      color: 0x34d399,
      purpose: 'Standard community access. Relies on @everyone for channel visibility.',
      permissions: [
        'ReadMessageHistory',
        'SendMessages',
        'SendMessagesInThreads',
        'EmbedLinks',
        'AttachFiles',
        'AddReactions',
        'Connect',
        'Speak',
      ],
    },
    {
      key: 'releaseAlerts',
      name: 'Kuro Release Alerts',
      color: 0xf472b6,
      purpose: 'Opt-in release audience. Receive no posting rights and no automatic mentions.',
      permissions: [],
    },
    {
      key: 'events',
      name: 'Kuro Event Goer',
      color: 0xfb7185,
      purpose: 'Opt-in events audience for event channels and RSVP reactions.',
      permissions: [],
    },
    {
      key: 'deviceAndroidTv',
      name: 'Kuro Android TV',
      color: 0x38bdf8,
      purpose: 'Device-selection role; can post in #android-tv only.',
      permissions: [],
    },
    {
      key: 'deviceFireTv',
      name: 'Kuro Fire TV',
      color: 0xf97316,
      purpose: 'Device-selection role; can post in #fire-tv only.',
      permissions: [],
    },
    {
      key: 'deviceMobile',
      name: 'Kuro Mobile',
      color: 0x4ade80,
      purpose: 'Device-selection role; can post in #mobile only.',
      permissions: [],
    },
  ],
  categories: [
    { key: 'startHere', name: '📌 START HERE' },
    { key: 'announcements', name: '📢 ANNOUNCEMENTS' },
    { key: 'downloadsReleases', name: '📦 DOWNLOADS & RELEASES' },
    { key: 'community', name: '💬 COMMUNITY' },
    { key: 'support', name: '🆘 SUPPORT' },
    { key: 'devices', name: '📺 DEVICE SELECTION' },
    { key: 'events', name: '🎉 EVENTS' },
    { key: 'development', name: '🧑‍💻 DEVELOPMENT' },
    {
      key: 'staff',
      name: '🔒 STAFF',
      overwrites: [
        { target: everyone, deny: ['ViewChannel'] },
        { target: role('moderator'), allow: staffWrite },
        {
          target: role('admin'),
          allow: [...staffWrite.filter((permission) => permission !== 'ManageMessages')],
        },
      ],
    },
  ],
  channels: [
    // 📌 START HERE
    {
      key: 'welcome',
      name: 'welcome',
      type: 'text',
      category: 'startHere',
      topic: 'Start here: what Kuro TV is, community rules, and where to go next.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: readOnlyDenials },
        { target: role('moderator'), allow: ['SendMessages', 'ManageMessages'] },
        { target: role('admin'), allow: ['SendMessages'] },
      ],
    },
    {
      key: 'rules',
      name: 'rules',
      type: 'text',
      category: 'startHere',
      topic: 'Community rules. Read before posting.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: readOnlyDenials },
        { target: role('moderator'), allow: ['SendMessages', 'ManageMessages'] },
      ],
    },
    {
      key: 'faq',
      name: 'faq',
      type: 'text',
      category: 'startHere',
      topic: 'Frequently asked questions about Kuro TV and this community.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: ['SendMessages', 'AddReactions'] },
        { target: role('moderator'), allow: ['SendMessages', 'ManageMessages'] },
      ],
    },
    {
      key: 'community-guide',
      name: 'community-guide',
      type: 'text',
      category: 'startHere',
      topic: 'Channel map, role menu guidance, and how to get help.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: readOnlyDenials },
        { target: role('moderator'), allow: ['SendMessages', 'ManageMessages'] },
      ],
    },

    // 📢 ANNOUNCEMENTS
    {
      key: 'server-news',
      name: 'server-news',
      type: 'text',
      category: 'announcements',
      topic: 'Server news from the Kuro Admin and Moderator team.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: announcementDenials },
        { target: role('moderator'), allow: ['SendMessages', 'EmbedLinks', 'ManageMessages'] },
        { target: role('admin'), allow: ['SendMessages', 'EmbedLinks'] },
      ],
    },
    {
      key: 'maintenance',
      name: 'maintenance',
      type: 'text',
      category: 'announcements',
      topic: 'Scheduled maintenance and temporary channel notices.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: announcementDenials },
        { target: role('moderator'), allow: ['SendMessages', 'EmbedLinks', 'ManageMessages'] },
      ],
    },
    {
      key: 'event-news',
      name: 'event-news',
      type: 'text',
      category: 'announcements',
      topic: 'Upcoming watch parties, community events, and polls.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: announcementDenials },
        { target: role('events'), allow: readOnly },
        { target: role('moderator'), allow: ['SendMessages', 'EmbedLinks', 'ManageMessages'] },
      ],
    },

    // 📦 DOWNLOADS & RELEASES
    {
      key: 'android-releases',
      name: 'android-releases',
      type: 'text',
      category: 'downloadsReleases',
      topic: `Read-only official Kuro TV releases. Latest APK: ${KURO_OFFICIAL_LINKS.latestRelease}`,
      overwrites: [
        { target: everyone, allow: readOnly, deny: readOnlyDenials },
        { target: role('releaseAlerts'), allow: readOnly },
        {
          target: role('moderator'),
          allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageMessages'],
        },
        { target: role('admin'), allow: ['ViewChannel', 'SendMessages', 'EmbedLinks'] },
      ],
    },
    {
      key: 'release-notes',
      name: 'release-notes',
      type: 'text',
      category: 'downloadsReleases',
      topic: `Full official release notes: ${KURO_OFFICIAL_LINKS.releases}`,
      overwrites: [
        { target: everyone, allow: readOnly, deny: readOnlyDenials },
        { target: role('releaseAlerts'), allow: readOnly },
        { target: role('moderator'), allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageMessages'] },
      ],
    },
    {
      key: 'release-discussion',
      name: 'release-discussion',
      type: 'text',
      category: 'downloadsReleases',
      topic: 'Public discussion about new Kuro TV builds. Keep it friendly and on-topic.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('releaseAlerts'), allow: ['AddReactions'] },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'beta-releases',
      name: 'beta-releases',
      type: 'text',
      category: 'downloadsReleases',
      topic: 'Beta builds for Kuro Beta Tester role. Read-only feed.',
      overwrites: [
        { target: everyone, deny: ['ViewChannel'] },
        { target: role('betaTester'), allow: ['ViewChannel', 'ReadMessageHistory'] },
        {
          target: role('developer'),
          allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks'],
        },
        { target: role('moderator'), allow: staffWrite },
      ],
    },
    {
      key: 'checksum-help',
      name: 'checksum-help',
      type: 'text',
      category: 'downloadsReleases',
      topic: 'Ask questions about verifying APK checksums and signing certificates.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },

    // 💬 COMMUNITY
    {
      key: 'general',
      name: 'general',
      type: 'text',
      category: 'community',
      topic: 'General Kuro TV chat.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'introductions',
      name: 'introductions',
      type: 'text',
      category: 'community',
      topic: 'Say hello and tell the community what you watch on.',
      overwrites: [{ target: everyone, allow: communityReadWrite }],
    },
    {
      key: 'media',
      name: 'media',
      type: 'text',
      category: 'community',
      topic: 'Screenshots and setup showcase.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'recommendations',
      name: 'recommendations',
      type: 'text',
      category: 'community',
      topic: 'Anime and manga recommendations.',
      overwrites: [{ target: everyone, allow: communityReadWrite }],
    },
    {
      key: 'anime-discussion',
      name: 'anime-discussion',
      type: 'text',
      category: 'community',
      topic: 'Seasonal anime and manga discussion.',
      overwrites: [{ target: everyone, allow: communityReadWrite }],
    },
    {
      key: 'suggestions',
      name: 'suggestions',
      type: 'text',
      category: 'community',
      topic: 'Ideas for this community. React to vote.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'lounge',
      name: 'lounge',
      type: 'voice',
      category: 'community',
      overwrites: [
        { target: everyone, allow: ['ViewChannel', 'Connect', 'Speak'] },
        { target: role('moderator'), allow: ['Connect', 'Speak'] },
      ],
    },

    // 🆘 SUPPORT
    {
      key: 'help',
      name: 'help',
      type: 'text',
      category: 'support',
      topic: 'Ask for help with Kuro TV. Search before posting.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        {
          target: role('supportHelper'),
          allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory'],
        },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'bug-reports',
      name: 'bug-reports',
      type: 'text',
      category: 'support',
      topic: 'Reproducible Kuro TV bugs. Include version, device, and steps.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('betaTester'), allow: ['SendMessages', 'AttachFiles'] },
        {
          target: role('supportHelper'),
          allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory'],
        },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'installation-help',
      name: 'installation-help',
      type: 'text',
      category: 'support',
      topic: 'Installing and updating the signed APK on Android TV, Fire TV, and mobile.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('supportHelper'), allow: ['SendMessages', 'EmbedLinks', 'AttachFiles'] },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'device-help',
      name: 'device-help',
      type: 'text',
      category: 'support',
      topic: 'Device-specific playback, remote, and codec questions.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('supportHelper'), allow: ['SendMessages', 'EmbedLinks', 'AttachFiles'] },
      ],
    },
    {
      key: 'feature-requests',
      name: 'feature-requests',
      type: 'text',
      category: 'support',
      topic: 'Suggest improvements to Kuro TV. Use one post per idea.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('developer'), allow: ['SendMessages', 'EmbedLinks', 'AttachFiles'] },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },

    // 📺 DEVICE SELECTION
    {
      key: 'android-tv',
      name: 'android-tv',
      type: 'text',
      category: 'devices',
      topic: 'Android TV owners. Pick the Kuro Android TV role to post here.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: ['SendMessages', 'AttachFiles'] },
        {
          target: role('deviceAndroidTv'),
          allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
        },
        { target: role('moderator'), allow: staffWrite },
      ],
    },
    {
      key: 'fire-tv',
      name: 'fire-tv',
      type: 'text',
      category: 'devices',
      topic: 'Fire TV owners. Pick the Kuro Fire TV role to post here.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: ['SendMessages', 'AttachFiles'] },
        {
          target: role('deviceFireTv'),
          allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
        },
        { target: role('moderator'), allow: staffWrite },
      ],
    },
    {
      key: 'mobile',
      name: 'mobile',
      type: 'text',
      category: 'devices',
      topic: 'Phone and tablet users. Pick the Kuro Mobile role to post here.',
      overwrites: [
        { target: everyone, allow: readOnly, deny: ['SendMessages', 'AttachFiles'] },
        {
          target: role('deviceMobile'),
          allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
        },
        { target: role('moderator'), allow: staffWrite },
      ],
    },
    {
      key: 'remote-controls',
      name: 'remote-controls',
      type: 'text',
      category: 'devices',
      topic: 'DPAD, remote mapping, and focusnavigation tips.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },

    // 🎉 EVENTS
    {
      key: 'event-chat',
      name: 'event-chat',
      type: 'text',
      category: 'events',
      topic: 'General chat during community events and watch parties.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('events'), allow: ['AddReactions'] },
      ],
    },
    {
      key: 'watch-party',
      name: 'watch-party',
      type: 'text',
      category: 'events',
      topic: 'Coordinated watch parties and episode schedules.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('events'), allow: ['AddReactions'] },
      ],
    },
    {
      key: 'polls',
      name: 'polls',
      type: 'text',
      category: 'events',
      topic: 'Community polls. React to vote.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        { target: role('events'), allow: ['AddReactions'] },
      ],
    },

    // 🧑‍💻 DEVELOPMENT
    {
      key: 'dev-chat',
      name: 'dev-chat',
      type: 'text',
      category: 'development',
      topic: 'Development discussion about the Kuro TV client. No support requests here.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        {
          target: role('developer'),
          allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
        },
        { target: role('moderator'), allow: ['ManageMessages'] },
      ],
    },
    {
      key: 'translations',
      name: 'translations',
      type: 'text',
      category: 'development',
      topic: 'Translation and localization discussion.',
      overwrites: [
        { target: everyone, allow: communityReadWrite },
        {
          target: role('contributor'),
          allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
        },
      ],
    },
    {
      key: 'beta-testing',
      name: 'beta-testing',
      type: 'text',
      category: 'development',
      topic: 'Structured beta feedback for Kuro Beta Testers and Developers.',
      overwrites: [
        { target: everyone, deny: ['ViewChannel'] },
        {
          target: role('betaTester'),
          allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions'],
        },
        {
          target: role('developer'),
          allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'],
        },
        { target: role('moderator'), allow: staffWrite },
      ],
    },

    // 🔒 STAFF
    {
      key: 'moderator-chat',
      name: 'moderator-chat',
      type: 'text',
      category: 'staff',
      topic: 'Private coordination for Kuro Moderators and Kuro Admin.',
    },
    {
      key: 'mod-log',
      name: 'mod-log',
      type: 'text',
      category: 'staff',
      topic: 'Human-readable moderation notes. Bot audit logs go to stdout and the audit channel.',
      overwrites: [
        { target: everyone, deny: ['ViewChannel'] },
        {
          target: role('moderator'),
          allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'AttachFiles', 'AddReactions'],
        },
      ],
    },
    {
      key: 'support-room',
      name: 'support-room',
      type: 'text',
      category: 'staff',
      topic: 'Private escalation space for support helpers and moderators.',
      overwrites: [
        { target: everyone, deny: ['ViewChannel'] },
        {
          target: role('supportHelper'),
          allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'],
        },
      ],
    },
    {
      key: 'release-staging',
      name: 'release-staging',
      type: 'text',
      category: 'staff',
      topic: 'Draft official release posts before publishing them to #android-releases.',
      overwrites: [
        { target: everyone, deny: ['ViewChannel'] },
        {
          target: role('moderator'),
          allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'],
        },
      ],
    },
  ],
};

function assertPermissionsSafe(names: readonly PermissionName[], location: string): void {
  for (const name of names) {
    if (!isSafePermission(name)) {
      throw new Error(`Unsafe permission "${name}" in ${location}. Only allowlisted permissions may be used.`);
    }
  }
  if ((permissionBits(names) & permissionBits([...DANGEROUS_PERMISSION_NAMES])) !== 0n) {
    throw new Error(`Dangerous permission found in ${location}.`);
  }
}

/**
 * Fails closed. Called by /apply, the plan preview, and the check:plan script.
 * Explicitly forbids management permissions on generated roles, including the
 * honorary Admin role.
 */
export function assertPlanIsLeastPrivilege(plan: ServerPlan): void {
  const seenRoles = new Set<string>();
  const seenCategories = new Set<string>();
  const seenChannels = new Set<string>();
  const forbiddenRoleBits = permissionBits([...FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES]);

  for (const item of plan.roles) {
    if (seenRoles.has(item.key)) throw new Error(`Duplicate role key: ${item.key}`);
    seenRoles.add(item.key);
    assertPermissionsSafe(item.permissions, `role ${item.key}`);
    if ((permissionBits(item.permissions) & forbiddenRoleBits) !== 0n) {
      throw new Error(
        `Generated role "${item.name}" contains a forbidden management/administration permission.`,
      );
    }
  }

  for (const item of plan.categories) {
    if (seenCategories.has(item.key)) throw new Error(`Duplicate category key: ${item.key}`);
    seenCategories.add(item.key);
    for (const overwrite of item.overwrites ?? []) {
      const location = `category ${item.key}`;
      assertPermissionsSafe(overwrite.allow ?? [], location);
      assertPermissionsSafe(overwrite.deny ?? [], location);
      if (
        (permissionBits(overwrite.allow ?? []) & forbiddenRoleBits) !== 0n ||
        (permissionBits(overwrite.deny ?? []) & forbiddenRoleBits) !== 0n
      ) {
        throw new Error(`Forbidden management permission in ${location}.`);
      }
    }
  }

  for (const item of plan.channels) {
    if (seenChannels.has(item.key)) throw new Error(`Duplicate channel key: ${item.key}`);
    seenChannels.add(item.key);
    if (!seenCategories.has(item.category)) {
      throw new Error(`Channel ${item.key} references unknown category ${item.category}.`);
    }
    for (const overwrite of item.overwrites ?? []) {
      if (overwrite.target.kind === 'role' && !seenRoles.has(overwrite.target.role)) {
        throw new Error(`Channel ${item.key} references unknown role ${overwrite.target.role}.`);
      }
      const location = `channel ${item.key}`;
      assertPermissionsSafe(overwrite.allow ?? [], location);
      assertPermissionsSafe(overwrite.deny ?? [], location);
      if (
        (permissionBits(overwrite.allow ?? []) & forbiddenRoleBits) !== 0n ||
        (permissionBits(overwrite.deny ?? []) & forbiddenRoleBits) !== 0n
      ) {
        throw new Error(`Forbidden management permission in ${location}.`);
      }
    }
  }

  // Explicit final guard: no plan may ever contain the Administrator bit.
  const allRoleBits = plan.roles.reduce((bits, item) => bits | permissionBits(item.permissions), 0n);
  if ((allRoleBits & PermissionFlagsBits.Administrator) !== 0n) {
    throw new Error('Plan contains Administrator. Refusing to continue.');
  }
}

export function planCounts(plan: ServerPlan): { roles: number; categories: number; channels: number } {
  return {
    roles: plan.roles.length,
    categories: plan.categories.length,
    channels: plan.channels.length,
  };
}
