import { PermissionFlagsBits } from 'discord.js';

export type PermissionName = keyof typeof PermissionFlagsBits;

/**
 * Permissions the builder is ever allowed to request or grant.
 * Administrator and all guild-management permissions are deliberately absent.
 */
export const SAFE_PERMISSION_NAMES = [
  'ViewChannel',
  'ReadMessageHistory',
  'SendMessages',
  'SendMessagesInThreads',
  'CreatePublicThreads',
  'CreatePrivateThreads',
  'EmbedLinks',
  'AttachFiles',
  'AddReactions',
  'UseExternalEmojis',
  'ManageMessages',
  'Connect',
  'Speak',
] as const satisfies readonly PermissionName[];

export type SafePermission = (typeof SAFE_PERMISSION_NAMES)[number];

/**
 * OAuth2 permissions the BOT ITSELF needs to apply the plan. This is a separate
 * concept from the permissions granted to generated roles: the bot needs
 * Manage Channels/Roles to create things, but no generated role ever gets them.
 */
export const BOT_RUNTIME_PERMISSION_NAMES = [
  'ManageChannels',
  'ManageRoles',
  'ViewChannel',
  'SendMessages',
  'EmbedLinks',
  'ReadMessageHistory',
  'AddReactions',
] as const satisfies readonly PermissionName[];

/** Must never be selected on the bot invite URL or relied upon at runtime. */
export const FORBIDDEN_BOT_RUNTIME_PERMISSION_NAMES = [
  'Administrator',
  'KickMembers',
  'BanMembers',
  'ManageGuild',
  'MentionEveryone',
] as const satisfies readonly PermissionName[];

/** Must never appear on any generated role, including honorary "Admin". */
export const FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES = [
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'KickMembers',
  'BanMembers',
  'MentionEveryone',
] as const satisfies readonly PermissionName[];

const safePermissionSet: ReadonlySet<string> = new Set(SAFE_PERMISSION_NAMES);

/** Defense-in-depth blocklist; checked even if the allowlist is edited incorrectly. */
export const DANGEROUS_PERMISSION_NAMES = [
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'BanMembers',
  'KickMembers',
  'MentionEveryone',
  'ManageNicknames',
  'ManageWebhooks',
  'ManageEvents',
  'ModerateMembers',
  'ManageThreads',
] as const satisfies readonly PermissionName[];

export function isSafePermission(name: string): name is SafePermission {
  return safePermissionSet.has(name);
}

export function permissionBits(names: readonly PermissionName[]): bigint {
  return names.reduce<bigint>((bits, name) => bits | PermissionFlagsBits[name], 0n);
}

/** Returns dangerous permission names present in a bitfield, if any. */
export function dangerousPermissionsIn(bits: bigint): PermissionName[] {
  return DANGEROUS_PERMISSION_NAMES.filter((name) => (bits & PermissionFlagsBits[name]) !== 0n);
}

export function formatPermissions(names: readonly PermissionName[]): string {
  return names.length > 0 ? names.join(', ') : 'none';
}
