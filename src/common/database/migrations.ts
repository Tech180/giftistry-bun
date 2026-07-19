import { sql } from './connection';
import { up as runLegacyMigrations } from './run-migration';

export async function runMigrations(dbSql: typeof sql = sql): Promise<void> {
  console.log('[INFO] Running database migrations...');

  await runLegacyMigrations();

  await dbSql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE DEFAULT NULL
  `;

  await dbSql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  `;

  await dbSql`
    ALTER TABLE list_shares ADD COLUMN IF NOT EXISTS granted_via VARCHAR(50) DEFAULT 'direct'
  `;

  await dbSql`
    ALTER TABLE lists ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'private'
  `;

  await dbSql`
    DO $$ BEGIN
      ALTER TABLE lists ADD CONSTRAINT lists_visibility_check
        CHECK (visibility IN ('private', 'friends', 'link'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sender_id, receiver_id)
    )
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS friends (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_a_id, user_b_id),
      CHECK (user_a_id < user_b_id)
    )
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS list_email_invites (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('viewer', 'collaborator')),
      token_hash VARCHAR(255) NOT NULL,
      invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS list_link_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('viewer', 'collaborator')),
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      max_uses INTEGER DEFAULT NULL,
      use_count INTEGER DEFAULT 0,
      revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT DEFAULT '',
      metadata JSONB DEFAULT '{}',
      read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS user_notification_prefs (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email_alerts BOOLEAN DEFAULT TRUE,
      marketing BOOLEAN DEFAULT FALSE,
      friend_requests BOOLEAN DEFAULT TRUE,
      list_shares BOOLEAN DEFAULT TRUE,
      item_claims BOOLEAN DEFAULT TRUE,
      comments BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    ALTER TABLE user_notification_prefs ADD COLUMN IF NOT EXISTS friend_requests BOOLEAN DEFAULT TRUE
  `;
  await dbSql`
    ALTER TABLE user_notification_prefs ADD COLUMN IF NOT EXISTS list_shares BOOLEAN DEFAULT TRUE
  `;
  await dbSql`
    ALTER TABLE user_notification_prefs ADD COLUMN IF NOT EXISTS item_claims BOOLEAN DEFAULT TRUE
  `;
  await dbSql`
    ALTER TABLE user_notification_prefs ADD COLUMN IF NOT EXISTS comments BOOLEAN DEFAULT TRUE
  `;

  await dbSql`
    ALTER TABLE list_link_tokens ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT NULL
  `;

  await dbSql`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE
  `;

  await dbSql`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS comment_reactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(100) NOT NULL,
      reaction VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, user_id, reaction)
    )
  `;

  await dbSql`
    ALTER TABLE lists DROP COLUMN IF EXISTS visibility
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS user_custom_themes (
      id VARCHAR(100) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      colors JSONB NOT NULL,
      advanced JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS site_policy (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      policy JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    INSERT INTO site_policy (id, policy)
    VALUES (1, '{}')
    ON CONFLICT (id) DO NOTHING
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      target_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      metadata JSONB DEFAULT '{}',
      ip_address VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS content_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
      target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('comment', 'wishlist', 'user')),
      target_id UUID NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
      resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts_before_lockout INTEGER DEFAULT -1`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 0`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS policy_json JSONB DEFAULT '{}'::jsonb`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE`;
  await dbSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS web_search_enabled BOOLEAN DEFAULT TRUE`;
  await dbSql`ALTER TABLE lists ADD COLUMN IF NOT EXISTS web_search_enabled BOOLEAN DEFAULT FALSE`;

  await dbSql`ALTER TABLE items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE`;
  await dbSql`ALTER TABLE items ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE`;
  await dbSql`ALTER TABLE items ADD COLUMN IF NOT EXISTS desired_quantity INTEGER DEFAULT NULL`;
  await dbSql`ALTER TABLE items ADD COLUMN IF NOT EXISTS multi_count BOOLEAN NOT NULL DEFAULT FALSE`;
  await dbSql`ALTER TABLE items ADD COLUMN IF NOT EXISTS other_users_can_see BOOLEAN DEFAULT NULL`;
  await dbSql`ALTER TABLE items ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await dbSql`ALTER TABLE items ADD COLUMN IF NOT EXISTS variations JSONB NOT NULL DEFAULT '[]'::jsonb`;

  await dbSql`
    CREATE TABLE IF NOT EXISTS item_item_links (
      item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      linked_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      PRIMARY KEY (item_id, linked_item_id),
      CHECK (item_id <> linked_item_id)
    )
  `;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_item_item_links_linked_item_id ON item_item_links (linked_item_id)`;

  // Backfill metadata columns + linked-item junction from legacy Description JSON.
  const legacyItems = await dbSql<{
    id: string;
    description: string | null;
  }[]>`
    SELECT id, description
    FROM items
    WHERE description IS NOT NULL
      AND trim(description) LIKE '{%'
      AND trim(description) LIKE '%}'
  `;

  for (const legacy of legacyItems) {
    try {
      const parsed = JSON.parse(legacy.description!);
      if (!parsed || typeof parsed !== 'object') continue;

      const customFields = parsed.CustomFields ?? {};
      const variations = Array.isArray(parsed.Variations) ? parsed.Variations : [];
      const plainText =
        typeof parsed.Text === 'string' && parsed.Text.trim() ? parsed.Text.trim() : null;

      await dbSql`
        UPDATE items
        SET is_favorite = COALESCE(${parsed.IsFavorite === true}, is_favorite),
            is_pinned = COALESCE(${parsed.IsPinned === true}, is_pinned),
            desired_quantity = COALESCE(${parsed.DesiredQuantity ?? null}, desired_quantity),
            multi_count = COALESCE(${parsed.MultiCount === true}, multi_count),
            other_users_can_see = COALESCE(${
              parsed.OtherUsersCanSee === undefined ? null : parsed.OtherUsersCanSee === true
            }, other_users_can_see),
            custom_fields = COALESCE(${JSON.stringify(customFields)}::jsonb, custom_fields),
            variations = COALESCE(${JSON.stringify(variations)}::jsonb, variations),
            description = ${plainText}
        WHERE id = ${legacy.id}
      `;

      const linkedIds: string[] = Array.isArray(parsed.LinkedItemIds)
        ? parsed.LinkedItemIds.filter((id: unknown) => typeof id === 'string' && id !== legacy.id)
        : [];
      for (const linkedId of linkedIds) {
        await dbSql`
          INSERT INTO item_item_links (item_id, linked_item_id)
          VALUES (${legacy.id}, ${linkedId})
          ON CONFLICT DO NOTHING
        `.catch(() => undefined);
      }
    } catch {
      // Ignore malformed legacy description JSON
    }
  }

  await dbSql`
    CREATE TABLE IF NOT EXISTS background_jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      kind VARCHAR(100) NOT NULL,
      list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
      phase VARCHAR(100) NOT NULL DEFAULT 'queued',
      progress_done INTEGER NOT NULL DEFAULT 0,
      progress_total INTEGER NOT NULL DEFAULT 0,
      message TEXT DEFAULT '',
      error TEXT DEFAULT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      result JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      finished_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
    )
  `;

  await dbSql`
    CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created
      ON background_jobs (status, created_at)
  `;

  await dbSql`
    CREATE INDEX IF NOT EXISTS idx_background_jobs_list_status
      ON background_jobs (list_id, status, created_at DESC)
  `;

  await dbSql`
    CREATE TABLE IF NOT EXISTS background_job_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id UUID NOT NULL REFERENCES background_jobs(id) ON DELETE CASCADE,
      item_id UUID REFERENCES items(id) ON DELETE SET NULL,
      link_url TEXT DEFAULT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
      error TEXT DEFAULT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE INDEX IF NOT EXISTS idx_background_job_items_job_status
      ON background_job_items (job_id, status)
  `;

  await dbSql`
    UPDATE users SET is_owner = true
    WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM users WHERE is_owner = true)
  `;

  const { runPascalCaseDataMigrations } = await import('./pascalize-data.migration');
  await runPascalCaseDataMigrations(dbSql as never);

  console.log('[INFO] Applying database performance indexes...');
  await dbSql`CREATE INDEX IF NOT EXISTS idx_user_custom_themes_user_id ON user_custom_themes (user_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists (user_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_list_shares_user_id ON list_shares (user_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests (receiver_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_friends_user_b_id ON friends (user_b_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_list_email_invites_list_id ON list_email_invites (list_id)`;
  await dbSql`CREATE UNIQUE INDEX IF NOT EXISTS idx_list_email_invites_token_hash ON list_email_invites (token_hash)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_list_link_tokens_list_id ON list_link_tokens (list_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications (user_id, created_at DESC)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_items_list_id ON items (list_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_item_links_item_id ON item_links (item_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims (item_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims (user_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_comments_list_id ON comments (list_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log (actor_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_audit_log_target_id ON audit_log (target_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports (reporter_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_content_reports_target_id ON content_reports (target_id)`;
  await dbSql`CREATE INDEX IF NOT EXISTS idx_content_reports_resolved_by ON content_reports (resolved_by)`;

  await dbSql`
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL
  `;

  console.log('[INFO] Applying user onboarding and OAuth columns...');
  await dbSql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE
  `;
  await dbSql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_sub VARCHAR(255) UNIQUE
  `;

  console.log('[INFO] Database migrations completed successfully.');
}
