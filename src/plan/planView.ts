import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { KURO_OFFICIAL_LINKS } from '../links.js';
import {
  BOT_RUNTIME_PERMISSION_NAMES,
  FORBIDDEN_BOT_RUNTIME_PERMISSION_NAMES,
  FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES,
  SAFE_PERMISSION_NAMES,
  formatPermissions,
} from '../utils/permissions.js';
import { planCounts, type RoleDefinition, type ServerPlan } from './serverPlan.js';

export const KURO_BRAND = 0x8b5cf6;

function clip(value: string, max = 1024): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push([...items.slice(index, index + size)]);
  return result;
}

function roleLine(role: RoleDefinition): string {
  return `• **${role.name}** — ${formatPermissions(role.permissions)}`;
}

export function buildPlanReply(plan: ServerPlan): {
  embeds: EmbedBuilder[];
  files: AttachmentBuilder[];
} {
  const counts = planCounts(plan);

  const structure = new EmbedBuilder()
    .setTitle('Kuro TV — server plan (preview only)')
    .setColor(KURO_BRAND)
    .setDescription(
      `${plan.summary}\n\nThis is a **preview**. Nothing has been created. \`/apply\` needs the server owner's confirmation.`,
    )
    .addFields(
      ...plan.categories.map((category) => {
        const channels = plan.channels.filter((channel) => channel.category === category.key);
        const lines = channels.map((channel) =>
          channel.type === 'voice' ? `• 🔊 ${channel.name}` : `• #${channel.name}`,
        );
        return {
          name: `${category.name} (${channels.length})`,
          value: clip(lines.join('\n') || '_No channels_'),
          inline: true,
        };
      }),
    )
    .setFooter({ text: `Plan ${plan.id} · version ${plan.version} · full JSON attached` });

  const roleGroups = chunks(plan.roles, 4);
  const roles = new EmbedBuilder()
    .setTitle(`Generated roles (${counts.roles})`)
    .setColor(0x22d3ee)
    .setDescription(
      'Roles are additive only. "Kuro Admin" is honorary and deliberately has no Administrator or management permission.',
    )
    .addFields(
      ...roleGroups.map((group, index) => ({
        name: `Roles ${index + 1}/${roleGroups.length}`,
        value: clip(group.map(roleLine).join('\n')),
      })),
    );

  const policy = new EmbedBuilder()
    .setTitle('Permission model — bot vs generated roles')
    .setColor(0xf59e0b)
    .addFields(
      {
        name: 'Bot runtime permissions (invite only)',
        value: [
          `Requests: ${BOT_RUNTIME_PERMISSION_NAMES.join(', ')}`,
          `Never requests: ${FORBIDDEN_BOT_RUNTIME_PERMISSION_NAMES.join(', ')}`,
        ].join('\n'),
      },
      {
        name: 'Generated role permissions',
        value: [
          `Allowlist: ${SAFE_PERMISSION_NAMES.join(', ')}`,
          `Forbidden: ${FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES.join(', ')}`,
          'No generated role receives Manage Channels or Manage Roles.',
        ].join('\n'),
      },
      {
        name: 'Role hierarchy',
        value:
          'The bot role must sit above every role it creates in Server Settings → Roles. ' +
          'If its highest role is @everyone, /apply refuses to start.',
      },
      {
        name: 'Release & privacy rules',
        value: [
          '• #android-releases is read-only; #release-discussion is public chat.',
          '• Official links only: Kuro-tv-Releases GitHub repository and Releases page.',
          '• /release-template version:1.5.5 previews the rich 1.5.5 announcement.',
          '• STAFF, beta-releases, and beta-testing deny @everyone visibility.',
          '• Existing resources are skipped, never edited, renamed, or deleted.',
          '• Names that already exist are skipped, so /apply is safe to retry.',
        ].join('\n'),
      },
      {
        name: 'Official links',
        value: [
          `[Releases](${KURO_OFFICIAL_LINKS.releases})`,
          `[Latest](${KURO_OFFICIAL_LINKS.latestRelease})`,
          `[Download page](${KURO_OFFICIAL_LINKS.downloadPage})`,
        ].join(' · '),
      },
    )
    .setFooter({
      text: `${counts.categories} categories · ${counts.channels} channels · ${counts.roles} roles · additive only`,
    });

  const file = new AttachmentBuilder(Buffer.from(JSON.stringify(plan, null, 2), 'utf8'), {
    name: 'kuro-server-plan.json',
    description: 'Machine-readable Kuro TV server plan',
  });

  return { embeds: [structure, roles, policy], files: [file] };
}
