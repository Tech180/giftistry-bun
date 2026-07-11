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

  await dbSql`
    UPDATE users SET is_owner = true
    WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM users WHERE is_owner = true)
  `;

  console.log('[INFO] Database migrations completed successfully.');
}
