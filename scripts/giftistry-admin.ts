#!/usr/bin/env bun
/**
 * Giftistry server admin CLI — run against the configured database (see env / .env).
 *
 * Usage:
 *   bun run giftistry-admin -- list-users
 *   bun run giftistry-admin -- reset-admin-password [--username NAME] [--password PASS]
 *   bun run giftistry-admin -- enable-password-login --confirm
 *   bun run giftistry-admin -- disable-password-login --confirm
 *   bun run giftistry-admin -- set-allow-setup true|false [--force]
 *   bun run giftistry-admin -- complete-owner-onboarding [--force]
 *   bun run giftistry-admin -- complete-user-onboarding --username NAME [--force]
 */

import { createAppContainer } from '../src/app.container';
import { env } from '../src/common/consts/env.consts';
import { loadConfig, saveConfig, sql } from '../src/common/database/connection';
import { validatePasswordPolicy } from '../src/common/domain/password-policy';
import { GetSitePolicyUseCase } from '../src/common/application/get-site-policy.use-case';
import { SaveSitePolicyUseCase } from '../src/common/application/save-site-policy.use-case';
import { PostgresSitePolicyRepository } from '../src/common/infrastructure/postgres-site-policy.repository';
import { PostgresAdminUserRepository } from '../src/modules/admin/infrastructure/postgres-admin-user.repository';
import { PostgresServerConfigRepository } from '../src/modules/system/infrastructure/postgres-server-config.repository';
import { SaveSystemSettingsUseCase } from '../src/modules/system/application/save-system-settings.use-case';
import { TestAiConnectionUseCase } from '../src/modules/system/application/test-ai-connection.use-case';
import { CompleteOwnerOnboardingUseCase } from '../src/modules/auth/application/complete-owner-onboarding.use-case';
import { CompleteUserOnboardingUseCase } from '../src/modules/auth/application/complete-user-onboarding.use-case';
import { PostgresUserRepository } from '../src/modules/auth/infrastructure/postgres-user.repository';

const USAGE = `Giftistry admin CLI

Commands:
  list-users
  reset-admin-password [--username NAME] [--password PASS]
  enable-password-login --confirm
  disable-password-login --confirm
  set-allow-setup <true|false> [--force]
  complete-owner-onboarding [--force]
  complete-user-onboarding --username NAME [--force]

Safety:
  Refuses to run against PGDATABASE=giftistry_test unless --force is passed.
`;

function parseFlag(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1]!.startsWith('--')) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name) || args.some((a) => a.startsWith(`${name}=`));
}

function refuseTestDbUnlessForced(args: string[]): void {
  if (env.PGDATABASE === 'giftistry_test' && !hasFlag(args, '--force')) {
    console.error(
      'Refusing to run against the test database (giftistry_test). Pass --force to override.'
    );
    process.exit(1);
  }
}

function randomPassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function listUsers(): Promise<void> {
  const rows = await sql<
    {
      Username: string;
      Email: string | null;
      IsAdmin: boolean;
      IsOwner: boolean;
      IsDisabled: boolean;
      CreatedAt: Date;
    }[]
  >`
    SELECT
      username as "Username",
      email as "Email",
      is_admin as "IsAdmin",
      is_owner as "IsOwner",
      is_disabled as "IsDisabled",
      created_at as "CreatedAt"
    FROM users
    ORDER BY created_at ASC
  `;

  if (rows.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log(`${'USERNAME'.padEnd(24)} ${'EMAIL'.padEnd(28)} ADMIN OWNER DISABLED CREATED`);
  for (const row of rows) {
    const created =
      row.CreatedAt instanceof Date
        ? row.CreatedAt.toISOString().slice(0, 10)
        : String(row.CreatedAt).slice(0, 10);
    console.log(
      `${row.Username.padEnd(24)} ${(row.Email ?? '-').padEnd(28)} ${row.IsAdmin ? 'yes' : 'no '} ${row.IsOwner ? 'yes' : 'no '} ${row.IsDisabled ? 'yes' : 'no '} ${created}`
    );
  }
}

async function resetAdminPassword(args: string[]): Promise<void> {
  const adminUserRepo = new PostgresAdminUserRepository();
  const username = parseFlag(args, '--username');

  let targetId: string | undefined;
  if (username) {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE username = ${username}
    `;
    if (!row) {
      console.error(`User not found: ${username}`);
      process.exit(1);
    }
    targetId = row.id;
  } else {
    const [owner] = await sql<{ id: string; Username: string }[]>`
      SELECT id, username as "Username" FROM users WHERE is_owner = true LIMIT 1
    `;
    if (owner) {
      targetId = owner.id;
      console.log(`Using owner account: ${owner.Username}`);
    } else {
      const [admin] = await sql<{ id: string; Username: string }[]>`
        SELECT id, username as "Username" FROM users WHERE is_admin = true ORDER BY created_at ASC LIMIT 1
      `;
      if (!admin) {
        console.error('No owner or admin user found. Pass --username explicitly.');
        process.exit(1);
      }
      targetId = admin.id;
      console.log(`Using admin account: ${admin.Username}`);
    }
  }

  let password = parseFlag(args, '--password');
  if (!password) {
    password = randomPassword(20);
    console.log('Generated password (save this now — it will not be shown again):');
    console.log(password);
  }

  try {
    validatePasswordPolicy(password);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const authHash = await Bun.password.hash(password);
  await adminUserRepo.resetPassword(targetId, authHash, true);
  console.log('Password reset. User must change password on next login.');
}

async function setPasswordLogin(enabled: boolean, args: string[]): Promise<void> {
  if (!hasFlag(args, '--confirm')) {
    console.error(`Refusing to ${enabled ? 'enable' : 'disable'} password login without --confirm`);
    process.exit(1);
  }

  const sitePolicyRepo = new PostgresSitePolicyRepository();
  const getSitePolicy = new GetSitePolicyUseCase(sitePolicyRepo);
  const saveSitePolicy = new SaveSitePolicyUseCase(sitePolicyRepo);
  const current = await getSitePolicy.execute();
  const next = await saveSitePolicy.execute({ ...current, AllowPasswordLogin: enabled });
  console.log(`AllowPasswordLogin is now ${next.AllowPasswordLogin ? 'true' : 'false'}.`);
}

async function setAllowSetup(valueRaw: string | undefined, args: string[]): Promise<void> {
  if (valueRaw !== 'true' && valueRaw !== 'false') {
    console.error('Expected: set-allow-setup true|false');
    process.exit(1);
  }
  const allowSetup = valueRaw === 'true';
  const config = loadConfig();
  saveConfig({ ...config, AllowSetup: allowSetup });
  console.log(`config.json AllowSetup set to ${allowSetup}.`);
  console.log(
    `Effective setup availability also depends on GIFTISTRY_ALLOW_SETUP=${env.GIFTISTRY_ALLOW_SETUP}.`
  );
}

async function completeOwnerOnboarding(): Promise<void> {
  const userRepo = new PostgresUserRepository();
  const [owner] = await sql<{ Id: string; Username: string }[]>`
    SELECT id as "Id", username as "Username" FROM users WHERE is_owner = true LIMIT 1
  `;
  if (!owner) {
    console.error('No owner user found (is_owner = true). Cannot complete owner onboarding.');
    process.exit(1);
  }

  const serverConfigRepo = new PostgresServerConfigRepository();
  const sitePolicyRepo = new PostgresSitePolicyRepository();
  const getSitePolicy = new GetSitePolicyUseCase(sitePolicyRepo);
  const saveSitePolicy = new SaveSitePolicyUseCase(sitePolicyRepo);
  const saveSystemSettings = new SaveSystemSettingsUseCase(serverConfigRepo, new TestAiConnectionUseCase());
  const useCase = new CompleteOwnerOnboardingUseCase(
    userRepo,
    serverConfigRepo,
    getSitePolicy,
    saveSitePolicy,
    saveSystemSettings
  );
  const result = await useCase.execute(owner.Id, { Skip: true });
  console.log(
    `OwnerOnboardingCompleted: ${result.OwnerOnboardingCompleted} (owner: ${owner.Username})`
  );
}

async function completeUserOnboarding(args: string[]): Promise<void> {
  const username = parseFlag(args, '--username');
  if (!username) {
    console.error('Expected: complete-user-onboarding --username NAME');
    process.exit(1);
  }

  const userRepo = new PostgresUserRepository();
  const user = await userRepo.findByUsername(username);
  if (!user) {
    console.error(`User not found: ${username}`);
    process.exit(1);
  }

  const useCase = new CompleteUserOnboardingUseCase(userRepo);
  await useCase.execute(user.Id);
  console.log(`User ${username} marked as onboarded.`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dashDash = argv.indexOf('--');
  const args = dashDash === -1 ? argv : argv.slice(dashDash + 1);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(command ? 0 : 1);
  }

  refuseTestDbUnlessForced(args);

  // Boot container so DB pool / modules initialize consistently with the API.
  createAppContainer();

  switch (command) {
    case 'list-users':
      await listUsers();
      break;
    case 'reset-admin-password':
      await resetAdminPassword(args);
      break;
    case 'enable-password-login':
      await setPasswordLogin(true, args);
      break;
    case 'disable-password-login':
      await setPasswordLogin(false, args);
      break;
    case 'set-allow-setup':
      await setAllowSetup(args[1], args);
      break;
    case 'complete-owner-onboarding':
    case 'complete-admin-onboarding':
      await completeOwnerOnboarding();
      break;
    case 'complete-user-onboarding':
      await completeUserOnboarding(args);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('[ERROR]', err instanceof Error ? err.message : err);
  process.exit(1);
});
