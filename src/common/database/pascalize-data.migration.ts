import type { Sql } from 'postgres';

const FLAT_PREDEFINED: Record<string, string> = {
  pantsSize: 'PantsSize',
  shirtSize: 'ShirtSize',
  shoesSize: 'ShoesSize',
  socksSize: 'SocksSize',
  color: 'Color',
  preferredColor: 'PreferredColor',
  modelNumber: 'ModelNumber',
  storageCapacity: 'StorageCapacity',
};

const FIELD_KEY_RENAMES: Record<string, string> = {
  pantsSize: 'PantsSize',
  waistFit: 'WaistFit',
  shirtSize: 'ShirtSize',
  shoesSize: 'ShoesSize',
  socksSize: 'SocksSize',
  preferredColor: 'PreferredColor',
  modelNumber: 'ModelNumber',
  storageCapacity: 'StorageCapacity',
};

const USER_POLICY_KEYS: Array<[string, string]> = [
  ['canCreateWishlists', 'CanCreateWishlists'],
  ['maxActiveWishlists', 'MaxActiveWishlists'],
  ['canUseComments', 'CanUseComments'],
  ['canUseAiFeatures', 'CanUseAiFeatures'],
  ['canSharePublicLinks', 'CanSharePublicLinks'],
  ['canUploadImages', 'CanUploadImages'],
  ['canSendFriendRequests', 'CanSendFriendRequests'],
  ['canUseCustomThemes', 'CanUseCustomThemes'],
];

const SITE_POLICY_KEYS: Array<[string, string]> = [
  ['registrationMode', 'RegistrationMode'],
  ['requireEmailVerification', 'RequireEmailVerification'],
  ['loginAttemptsBeforeLockout', 'LoginAttemptsBeforeLockout'],
  ['lockoutDurationMinutes', 'LockoutDurationMinutes'],
  ['maintenanceMode', 'MaintenanceMode'],
  ['maintenanceMessage', 'MaintenanceMessage'],
  ['allowPasswordLogin', 'AllowPasswordLogin'],
  ['allowedEmailDomains', 'AllowedEmailDomains'],
  ['defaultUserPolicy', 'DefaultUserPolicy'],
];

const NOTIFICATION_META_KEYS: Record<string, string> = {
  requestId: 'RequestId',
  senderId: 'SenderId',
  listId: 'ListId',
  userId: 'UserId',
  role: 'Role',
  sharedBy: 'SharedBy',
  type: 'Type',
  accepterId: 'AccepterId',
  inviteType: 'InviteType',
};

function prefer<T>(pascal: T | undefined, camel: T | undefined): T | undefined {
  if (pascal !== undefined && pascal !== null) return pascal;
  if (camel !== undefined && camel !== null) return camel;
  return undefined;
}

function normalizeVariations(raw: unknown): Array<{ Name: string; Quantity: number }> | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const result = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const name =
        (typeof row.Name === 'string' && row.Name) ||
        (typeof row.name === 'string' && row.name) ||
        '';
      const quantity = Number(prefer(row.Quantity, row.quantity));
      if (!name.trim()) return null;
      return { Name: name.trim(), Quantity: Number.isFinite(quantity) ? quantity : 0 };
    })
    .filter((entry): entry is { Name: string; Quantity: number } => entry !== null);
  return result.length > 0 ? result : undefined;
}

/** Pure rewrite of Item.Description JSON to PascalCase-only shape. Returns null if unchanged/invalid. */
export function pascalizeItemDescriptionJson(raw: string): string | null {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    parsed = value as Record<string, unknown>;
  } catch {
    return null;
  }

  const predefined: Record<string, string | null> = {};
  const existingCustom = parsed.CustomFields;
  if (existingCustom && typeof existingCustom === 'object' && !Array.isArray(existingCustom)) {
    const cf = existingCustom as Record<string, unknown>;
    const pre = cf.Predefined ?? cf.predefined;
    if (pre && typeof pre === 'object' && !Array.isArray(pre)) {
      for (const [key, value] of Object.entries(pre as Record<string, unknown>)) {
        const storageKey = FLAT_PREDEFINED[key] ?? (/^[A-Z]/.test(key) ? key : key);
        if (typeof value === 'string' && value.trim()) predefined[storageKey] = value.trim();
        else if (value === null) predefined[storageKey] = null;
      }
    }
  }

  for (const [camel, pascal] of Object.entries(FLAT_PREDEFINED)) {
    const val = parsed[camel];
    if (typeof val === 'string' && val.trim() && predefined[pascal] == null) {
      predefined[pascal] = val.trim();
    }
  }

  const userDefined: Record<string, string> = {};
  if (existingCustom && typeof existingCustom === 'object' && !Array.isArray(existingCustom)) {
    const cf = existingCustom as Record<string, unknown>;
    const ud = cf.UserDefined ?? cf.userDefined;
    if (ud && typeof ud === 'object' && !Array.isArray(ud)) {
      for (const [key, value] of Object.entries(ud as Record<string, unknown>)) {
        if (typeof value === 'string' && value.trim()) userDefined[key] = value.trim();
      }
    }
  }
  if (Array.isArray(parsed.custom)) {
    for (const field of parsed.custom) {
      if (!field || typeof field !== 'object') continue;
      const row = field as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const value = typeof row.value === 'string' ? row.value.trim() : '';
      if (name && value) userDefined[name] = value;
    }
  }

  const text = prefer(
    typeof parsed.Text === 'string' ? parsed.Text : undefined,
    typeof parsed.text === 'string' ? parsed.text : undefined
  );

  const out: Record<string, unknown> = {
    Text: text ?? null,
    CustomFields: {
      Predefined: predefined,
      UserDefined: userDefined,
    },
  };

  const isFavorite = prefer(parsed.IsFavorite, parsed.isFavorite);
  if (isFavorite === true) out.IsFavorite = true;

  const isPinned = prefer(parsed.IsPinned, parsed.isPinned);
  if (isPinned === true) out.IsPinned = true;

  const desiredQuantity = prefer(parsed.DesiredQuantity, parsed.desiredQuantity);
  if (desiredQuantity !== undefined) out.DesiredQuantity = Number(desiredQuantity);

  const variations = normalizeVariations(prefer(parsed.Variations, parsed.variations));
  if (variations) out.Variations = variations;

  const linkedItemIds = prefer(parsed.LinkedItemIds, parsed.linkedItemIds);
  if (Array.isArray(linkedItemIds) && linkedItemIds.length > 0) out.LinkedItemIds = linkedItemIds;

  const otherUsersCanSee = prefer(parsed.OtherUsersCanSee, parsed.otherUsersCanSee);
  if (otherUsersCanSee !== undefined) out.OtherUsersCanSee = Boolean(otherUsersCanSee);

  const multiCount = prefer(parsed.MultiCount, parsed.multiCount);
  if (multiCount === true) out.MultiCount = true;

  const next = JSON.stringify(out);
  return next === raw ? null : next;
}

function pascalizeUserPolicyObject(raw: unknown): Record<string, unknown> {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [camel, pascal] of USER_POLICY_KEYS) {
    const value = prefer(obj[pascal], obj[camel]);
    if (value !== undefined) out[pascal] = value;
  }
  return out;
}

export function pascalizeSitePolicyObject(raw: unknown): Record<string, unknown> {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [camel, pascal] of SITE_POLICY_KEYS) {
    if (pascal === 'DefaultUserPolicy') {
      const nested = prefer(obj.DefaultUserPolicy, obj.defaultUserPolicy);
      out.DefaultUserPolicy = pascalizeUserPolicyObject(nested ?? {});
      continue;
    }
    const value = prefer(obj[pascal], obj[camel]);
    if (value !== undefined) out[pascal] = value;
  }
  return out;
}

export function pascalizeNotificationMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let changed = false;
  for (const [key, value] of Object.entries(obj)) {
    const nextKey = NOTIFICATION_META_KEYS[key] ?? (/^[A-Z]/.test(key) ? key : key);
    if (nextKey !== key) changed = true;
    out[nextKey] = value;
  }
  return changed ? out : null;
}

async function ensureMigrationFlags(dbSql: Sql): Promise<void> {
  await dbSql`
    CREATE TABLE IF NOT EXISTS schema_migration_flags (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

async function hasFlag(dbSql: Sql, name: string): Promise<boolean> {
  const rows = await dbSql`SELECT 1 FROM schema_migration_flags WHERE name = ${name} LIMIT 1`;
  return rows.length > 0;
}

async function setFlag(dbSql: Sql, name: string): Promise<void> {
  await dbSql`
    INSERT INTO schema_migration_flags (name) VALUES (${name})
    ON CONFLICT (name) DO NOTHING
  `;
}

export async function runPascalCaseDataMigrations(dbSql: Sql): Promise<void> {
  await ensureMigrationFlags(dbSql);

  if (!(await hasFlag(dbSql, 'pascalize_item_descriptions_v1'))) {
    const rows = await dbSql`
      SELECT id, description
      FROM items
      WHERE description IS NOT NULL
        AND description LIKE '{%'
        AND description LIKE '%}'
    `;
    let updated = 0;
    for (const row of rows) {
      const next = pascalizeItemDescriptionJson(String(row.description));
      if (!next) continue;
      await dbSql`UPDATE items SET description = ${next} WHERE id = ${row.id}`;
      updated += 1;
    }
    console.log(`[INFO] Pascalized ${updated} item description(s)`);
    await setFlag(dbSql, 'pascalize_item_descriptions_v1');
  }

  if (!(await hasFlag(dbSql, 'pascalize_field_keys_v1'))) {
    for (const [from, to] of Object.entries(FIELD_KEY_RENAMES)) {
      await dbSql`
        UPDATE item_field_definitions
        SET field_key = ${to}
        WHERE field_key = ${from}
      `;
      await dbSql`
        UPDATE item_field_dependencies
        SET trigger_field_key = ${to}
        WHERE trigger_field_key = ${from}
      `;
    }
    console.log('[INFO] Pascalized item_field_definitions / dependencies keys');
    await setFlag(dbSql, 'pascalize_field_keys_v1');
  }

  if (!(await hasFlag(dbSql, 'pascalize_policies_v1'))) {
    const siteRows = await dbSql`SELECT id, policy FROM site_policy`;
    for (const row of siteRows) {
      const next = pascalizeSitePolicyObject(row.policy);
      await dbSql`UPDATE site_policy SET policy = ${dbSql.json(next as never)} WHERE id = ${row.id}`;
    }

    const userRows = await dbSql`SELECT id, policy_json FROM users WHERE policy_json IS NOT NULL`;
    for (const row of userRows) {
      const next = pascalizeUserPolicyObject(row.policy_json);
      await dbSql`UPDATE users SET policy_json = ${dbSql.json(next as never)} WHERE id = ${row.id}`;
    }
    console.log('[INFO] Pascalized site_policy / users.policy_json');
    await setFlag(dbSql, 'pascalize_policies_v1');
  }

  if (!(await hasFlag(dbSql, 'pascalize_notification_metadata_v1'))) {
    const rows = await dbSql`
      SELECT id, metadata FROM notifications
      WHERE metadata IS NOT NULL AND metadata <> '{}'::jsonb
    `;
    let updated = 0;
    for (const row of rows) {
      const next = pascalizeNotificationMetadata(row.metadata);
      if (!next) continue;
      await dbSql`UPDATE notifications SET metadata = ${dbSql.json(next as never)} WHERE id = ${row.id}`;
      updated += 1;
    }
    console.log(`[INFO] Pascalized ${updated} notification metadata row(s)`);
    await setFlag(dbSql, 'pascalize_notification_metadata_v1');
  }
}
