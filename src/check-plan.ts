import { KURO_OFFICIAL_LINKS } from './links.js';
import { assertPlanIsLeastPrivilege, KURO_SERVER_PLAN, planCounts } from './plan/serverPlan.js';
import {
  BOT_RUNTIME_PERMISSION_NAMES,
  FORBIDDEN_BOT_RUNTIME_PERMISSION_NAMES,
  FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES,
  SAFE_PERMISSION_NAMES,
  permissionBits,
} from './utils/permissions.js';

assertPlanIsLeastPrivilege(KURO_SERVER_PLAN);

const plan = KURO_SERVER_PLAN;
const forbiddenRoleBits = permissionBits([...FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES]);
const rolesWithForbiddenPermissions = plan.roles.filter(
  (role) => (permissionBits(role.permissions) & forbiddenRoleBits) !== 0n,
).length;

const androidReleases = plan.channels.find((channel) => channel.key === 'android-releases');
const releaseDiscussion = plan.channels.find((channel) => channel.key === 'release-discussion');
const everyoneDenies = androidReleases?.overwrites?.find((overwrite) => overwrite.target.kind === 'everyone')?.deny ?? [];
const everyoneAllows = releaseDiscussion?.overwrites?.find(
  (overwrite) => overwrite.target.kind === 'everyone',
)?.allow ?? [];

console.log(
  JSON.stringify(
    {
      ok: true,
      planId: plan.id,
      planVersion: plan.version,
      ...planCounts(plan),
      categories: plan.categories.map((category) => category.name),
      roles: plan.roles.map((role) => role.name),
      downloadsAndReleases: {
        categoryPresent: plan.categories.some((category) => category.key === 'downloadsReleases'),
        androidReleasesReadOnly:
          everyoneDenies.includes('SendMessages') && everyoneDenies.includes('AddReactions'),
        releaseDiscussionPublic: everyoneAllows.includes('SendMessages'),
      },
      permissionModel: {
        botRuntimeRequested: [...BOT_RUNTIME_PERMISSION_NAMES],
        botRuntimeForbidden: [...FORBIDDEN_BOT_RUNTIME_PERMISSION_NAMES],
        generatedRoleAllowlist: [...SAFE_PERMISSION_NAMES],
        generatedRoleForbidden: [...FORBIDDEN_GENERATED_ROLE_PERMISSION_NAMES],
        rolesWithAdministratorOrManagementPermissions: rolesWithForbiddenPermissions,
      },
      officialLinks: {
        releases: KURO_OFFICIAL_LINKS.releases,
        latest: KURO_OFFICIAL_LINKS.latestRelease,
        release155: KURO_OFFICIAL_LINKS.release155,
      },
    },
    null,
    2,
  ),
);
