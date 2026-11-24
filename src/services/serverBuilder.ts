import {
  ChannelType,
  EmbedBuilder,
  OverwriteType,
  PermissionFlagsBits,
  type CategoryChannel,
  type Guild,
  type OverwriteResolvable,
  type Role,
} from 'discord.js';
import { logger } from '../logger.js';
import { KURO_BRAND } from '../plan/planView.js';
import {
  assertPlanIsLeastPrivilege,
  type CategoryKey,
  type OverwriteDefinition,
  type RoleKey,
  type ServerPlan,
} from '../plan/serverPlan.js';
import {
  BOT_RUNTIME_PERMISSION_NAMES,
  FORBIDDEN_BOT_RUNTIME_PERMISSION_NAMES,
  FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES,
  permissionBits,
  type SafePermission,
} from '../utils/permissions.js';
import { mirrorAudit } from './auditLog.js';

export interface ApplyContext {
  requestId: string;
  actorId: string;
  ownerId: string;
}

export interface ApplyResult {
  requestId: string;
  createdRoles: string[];
  createdCategories: string[];
  createdChannels: string[];
  skippedRoles: string[];
  skippedCategories: string[];
  skippedChannels: string[];
  warnings: string[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fails before any mutation if the bot cannot safely do the work. */
export function preflightGuild(guild: Guild): string[] {
  const warnings: string[] = [];
  const me = guild.members.me;
  if (!me) throw new Error('Bot member is not cached. Please retry in a moment.');

  // Runtime permissions are about the BOT. Generated roles are checked separately
  // by assertPlanIsLeastPrivilege and never receive management permissions.
  const missing = BOT_RUNTIME_PERMISSION_NAMES.filter((name) =>
    !me.permissions.has(PermissionFlagsBits[name]),
  );
  if (missing.length > 0) {
    throw new Error(`Bot is missing required permissions: ${missing.join(', ')}. Nothing was changed.`);
  }

  const overGranted = FORBIDDEN_BOT_RUNTIME_PERMISSION_NAMES.filter((name) =>
    me.permissions.has(PermissionFlagsBits[name]),
  );
  if (overGranted.length > 0) {
    warnings.push(
      `Bot was granted permissions it must not request: ${overGranted.join(', ')}. ` +
        'Remove them from the bot role; the builder does not use them.',
    );
    logger.warn('apply.preflight.bot_overpermissioned', {
      guildId: guild.id,
      permissions: overGranted,
    });
  }

  if (me.roles.highest.position <= 0) {
    throw new Error('Bot needs a role above @everyone to create and assign roles. Nothing was changed.');
  }
  return warnings;
}

interface OverwriteContext {
  guildId: string;
  everyoneRoleId: string;
  roleMap: Map<RoleKey, Role>;
  unusableRoles: Set<RoleKey>;
  warnings: string[];
  location: string;
  context: ApplyContext;
}

function buildOverwrites(definitions: readonly OverwriteDefinition[] | undefined, ctx: OverwriteContext): OverwriteResolvable[] {
  const overwrites: OverwriteResolvable[] = [];
  for (const definition of definitions ?? []) {
    const allow = permissionBits(definition.allow ?? []);
    const deny = permissionBits(definition.deny ?? []);
    if (allow === 0n && deny === 0n) continue;

    let targetId: string;
    let targetLabel: string;
    if (definition.target.kind === 'everyone') {
      targetId = ctx.everyoneRoleId;
      targetLabel = '@everyone';
    } else {
      const role = ctx.roleMap.get(definition.target.role);
      if (!role || ctx.unusableRoles.has(definition.target.role)) {
        ctx.warnings.push(
          `Skipped a permission rule for ${definition.target.role} in ${ctx.location} because that role could not be used safely.`,
        );
        continue;
      }
      targetId = role.id;
      targetLabel = role.name;
    }

    if ((deny & PermissionFlagsBits.Administrator) !== 0n || (allow & PermissionFlagsBits.Administrator) !== 0n) {
      ctx.warnings.push(`Refused an Administrator overwrite in ${ctx.location}.`);
      continue;
    }

    overwrites.push({ id: targetId, type: OverwriteType.Role, allow, deny });
    logger.debug('apply.overwrite', {
      guildId: ctx.guildId,
      requestId: ctx.context.requestId,
      location: ctx.location,
      target: targetLabel,
      allow: (definition.allow ?? []).join(','),
      deny: (definition.deny ?? []).join(','),
    });
  }
  return overwrites;
}

function determineRoleUsability(role: Role, expected: RoleDefinitionLike, botHighestPosition: number): string[] {
  const problems: string[] = [];
  const dangerous = FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES.filter((name) =>
    role.permissions.has(PermissionFlagsBits[name]),
  );
  if (dangerous.length > 0) problems.push(`forbidden permissions (${dangerous.join(', ')})`);
  if (role.position >= botHighestPosition) problems.push('role is not below the bot highest role');
  return problems;
}

interface RoleDefinitionLike {
  permissions: readonly SafePermission[];
}

/**
 * Applies the canonical plan additively. Existing resources are reused only when
 * their permissions match; nothing is ever renamed, edited, or deleted.
 */
export async function applyPlan(guild: Guild, plan: ServerPlan, context: ApplyContext): Promise<ApplyResult> {
  assertPlanIsLeastPrivilege(plan);

  const result: ApplyResult = {
    requestId: context.requestId,
    createdRoles: [],
    createdCategories: [],
    createdChannels: [],
    skippedRoles: [],
    skippedCategories: [],
    skippedChannels: [],
    warnings: preflightGuild(guild),
  };

  const reason = `Kuro builder apply ${context.requestId} confirmed by ${context.ownerId}`;
  const me = guild.members.me;
  const botHighestPosition = me?.roles.highest.position ?? 0;
  const everyoneRoleId = guild.roles.everyone.id;
  const roleMap = new Map<RoleKey, Role>();
  const unusableRoles = new Set<RoleKey>();

  logger.action('apply.started', {
    guildId: guild.id,
    requestId: context.requestId,
    requesterId: context.actorId,
    ownerId: context.ownerId,
    planId: plan.id,
    planVersion: plan.version,
  });

  for (const definition of plan.roles) {
    const existing = guild.roles.cache.find((role) => role.name.toLowerCase() === definition.name.toLowerCase());
    if (existing) {
      const problems = determineRoleUsability(existing, definition, botHighestPosition);
      const expected = new Set<SafePermission>(definition.permissions);
      const extra = ({ ...PermissionFlagsBits } as Record<string, bigint>);
      const unexpected = Object.entries(extra)
        .filter(([name, bit]) => !expected.has(name as SafePermission) && existing.permissions.has(bit))
        .map(([name]) => name);
      if (problems.length > 0 || unexpected.length > 0) {
        unusableRoles.add(definition.key);
        result.warnings.push(
          `Existing role "${definition.name}" was not reused: ${[...problems, ...unexpected].join(', ') || 'permissions differ'}.`,
        );
      } else {
        roleMap.set(definition.key, existing);
        result.skippedRoles.push(definition.name);
      }
      logger.action('apply.role.skipped', {
        guildId: guild.id,
        requestId: context.requestId,
        roleName: definition.name,
        roleId: existing.id,
      });
      continue;
    }

    try {
      const created = await guild.roles.create({
        name: definition.name,
        color: definition.color,
        permissions: permissionBits(definition.permissions),
        hoist: false,
        mentionable: false,
        reason,
      });
      roleMap.set(definition.key, created);
      result.createdRoles.push(created.name);
      logger.action('apply.role.created', {
        guildId: guild.id,
        requestId: context.requestId,
        roleName: created.name,
        roleId: created.id,
        permissions: definition.permissions.join(','),
      });
    } catch (error) {
      unusableRoles.add(definition.key);
      result.warnings.push(`Could not create role "${definition.name}": ${errorMessage(error)}`);
      logger.error('apply.role.failed', {
        guildId: guild.id,
        requestId: context.requestId,
        roleName: definition.name,
        error: errorMessage(error),
      });
    }
    await delay(150);
  }

  const overwriteContext = (location: string): OverwriteContext => ({
    guildId: guild.id,
    everyoneRoleId,
    roleMap,
    unusableRoles,
    warnings: result.warnings,
    location,
    context,
  });

  const categoryMap = new Map<CategoryKey, CategoryChannel>();
  for (const definition of plan.categories) {
    const existing = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name.toLowerCase() === definition.name.toLowerCase(),
    );
    if (existing && existing.type === ChannelType.GuildCategory) {
      categoryMap.set(definition.key, existing);
      result.skippedCategories.push(existing.name);
      result.warnings.push(`Existing category "${existing.name}" was reused; its permissions were not changed.`);
      logger.action('apply.category.skipped', {
        guildId: guild.id,
        requestId: context.requestId,
        categoryName: existing.name,
        categoryId: existing.id,
      });
      continue;
    }

    try {
      const created = await guild.channels.create({
        name: definition.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: buildOverwrites(
          definition.overwrites,
          overwriteContext(`category ${definition.key}`),
        ),
        reason,
      });
      categoryMap.set(definition.key, created);
      result.createdCategories.push(created.name);
      logger.action('apply.category.created', {
        guildId: guild.id,
        requestId: context.requestId,
        categoryName: created.name,
        categoryId: created.id,
      });
    } catch (error) {
      result.warnings.push(`Could not create category "${definition.name}": ${errorMessage(error)}`);
      logger.error('apply.category.failed', {
        guildId: guild.id,
        requestId: context.requestId,
        categoryName: definition.name,
        error: errorMessage(error),
      });
    }
    await delay(200);
  }

  for (const definition of plan.channels) {
    const parent = categoryMap.get(definition.category);
    if (!parent) {
      result.warnings.push(`Skipped #${definition.name}: its category was unavailable.`);
      continue;
    }

    const existing = guild.channels.cache.find(
      (channel) =>
        channel.parentId === parent.id &&
        channel.name.toLowerCase() === definition.name.toLowerCase() &&
        (definition.type === 'voice'
          ? channel.type === ChannelType.GuildVoice
          : channel.type === ChannelType.GuildText),
    );
    if (existing) {
      result.skippedChannels.push(existing.name);
      result.warnings.push(`Existing channel "${existing.name}" was reused; its permissions were not changed.`);
      logger.action('apply.channel.skipped', {
        guildId: guild.id,
        requestId: context.requestId,
        channelName: existing.name,
        channelId: existing.id,
      });
      continue;
    }

    const permissionOverwrites = buildOverwrites(
      definition.overwrites,
      overwriteContext(`channel ${definition.key}`),
    );

    try {
      const created =
        definition.type === 'voice'
          ? await guild.channels.create({
              name: definition.name,
              type: ChannelType.GuildVoice,
              parent: parent.id,
              permissionOverwrites,
              reason,
            })
          : await guild.channels.create({
              name: definition.name,
              type: ChannelType.GuildText,
              parent: parent.id,
              topic: definition.topic,
              permissionOverwrites,
              reason,
            });
      result.createdChannels.push(created.name);
      logger.action('apply.channel.created', {
        guildId: guild.id,
        requestId: context.requestId,
        channelName: created.name,
        channelId: created.id,
        channelType: definition.type,
        parentId: parent.id,
      });
    } catch (error) {
      result.warnings.push(`Could not create ${definition.type} channel "${definition.name}": ${errorMessage(error)}`);
      logger.error('apply.channel.failed', {
        guildId: guild.id,
        requestId: context.requestId,
        channelName: definition.name,
        error: errorMessage(error),
      });
    }
    await delay(200);
  }

  logger.action('apply.completed', {
    guildId: guild.id,
    requestId: context.requestId,
    createdRoles: result.createdRoles.length,
    createdCategories: result.createdCategories.length,
    createdChannels: result.createdChannels.length,
    skipped: result.skippedRoles.length + result.skippedCategories.length + result.skippedChannels.length,
    warnings: result.warnings.length,
  });

  const summary = new EmbedBuilder()
    .setTitle('Kuro TV — apply complete')
    .setColor(result.warnings.length > 0 ? 0xf59e0b : 0x22c55e)
    .setDescription(`Request \`${context.requestId}\` was approved by the server owner and applied.`)
    .addFields(
      {
        name: 'Created',
        value: [
          `Roles: ${result.createdRoles.length}`,
          `Categories: ${result.createdCategories.length}`,
          `Channels: ${result.createdChannels.length}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Skipped (already present)',
        value: [
          `Roles: ${result.skippedRoles.length}`,
          `Categories: ${result.skippedCategories.length}`,
          `Channels: ${result.skippedChannels.length}`,
        ].join('\n'),
        inline: true,
      },
    )
    .setFooter({ text: 'No existing server resources were edited or deleted.' })
    .setTimestamp();

  if (result.warnings.length > 0) {
    summary.addFields({
      name: `Warnings (${result.warnings.length})`,
      value: result.warnings.join('\n').slice(0, 1024),
    });
  }

  await mirrorAudit(guild.client, summary);
  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildApplyResultEmbed(result: ApplyResult): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(result.warnings.length > 0 ? 'Applied with warnings' : 'Applied successfully')
    .setColor(result.warnings.length > 0 ? 0xf59e0b : KURO_BRAND)
    .setDescription(
      `Created ${result.createdRoles.length} roles, ${result.createdCategories.length} categories and ` +
        `${result.createdChannels.length} channels. Nothing was deleted or overwritten.`,
    )
    .addFields({
      name: 'Skipped (existing names left untouched)',
      value:
        [
          ...result.skippedRoles.map((name) => `Role: ${name}`),
          ...result.skippedCategories.map((name) => `Category: ${name}`),
          ...result.skippedChannels.map((name) => `Channel: #${name}`),
        ].join('\n') || 'None — everything was newly created.',
    })
    .setFooter({ text: `Request ${result.requestId} · audit written to stdout and action log` })
    .setTimestamp();

  if (result.warnings.length > 0) {
    embed.addFields({ name: 'Warnings', value: result.warnings.join('\n').slice(0, 1024) });
  }
  return embed;
}
