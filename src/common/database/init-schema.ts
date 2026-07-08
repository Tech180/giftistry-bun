import { sql } from './connection';

export async function initializeSchema(dbSql: typeof sql = sql) {
  // Check if users table exists
  let exists = false;
  try {
    const [row] = await dbSql<any[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `;
    exists = row?.exists;
  } catch (err) {
    // If information_schema check fails, it means the database is empty or has connection issues
    exists = false;
  }

  if (exists) {
    console.log('[INFO] Database schema already exists. Skipping initialization.');
    return;
  }

  console.log('[INFO] Database schema does not exist. Initializing schema tables...');

  // Create tables in order of dependency
  await dbSql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await dbSql`
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        auth_hash VARCHAR(255) NOT NULL,
        bio TEXT DEFAULT '',
        theme VARCHAR(100) DEFAULT 'default',
        avatar TEXT DEFAULT NULL,
        birthday DATE DEFAULT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255) DEFAULT NULL,
        email_verification_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret VARCHAR(255) DEFAULT NULL,
        two_factor_recovery_codes TEXT DEFAULT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        is_owner BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_online TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE user_custom_themes (
        id VARCHAR(100) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        colors JSONB NOT NULL,
        advanced JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE user_passkeys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        backed_up BOOLEAN DEFAULT FALSE,
        transports VARCHAR(255) DEFAULT '[]'
    )
  `;

  await dbSql`
    CREATE TABLE priorities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        label VARCHAR(50) NOT NULL,
        weight INTEGER NOT NULL,
        UNIQUE(user_id, label)
    )
  `;

  await dbSql`
    CREATE TABLE lists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        allow_group_funds BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        category VARCHAR(255) DEFAULT 'generic',
        reveal_suggestions BOOLEAN DEFAULT TRUE,
        ai_enabled BOOLEAN DEFAULT FALSE,
        visibility VARCHAR(50) DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'link')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE list_shares (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) CHECK (role IN ('viewer', 'collaborator')),
        granted_via VARCHAR(50) DEFAULT 'direct',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(list_id, user_id)
    )
  `;

  await dbSql`
    CREATE TABLE friend_requests (
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
    CREATE TABLE friends (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_a_id, user_b_id),
        CHECK (user_a_id < user_b_id)
    )
  `;

  await dbSql`
    CREATE TABLE list_email_invites (
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
    CREATE TABLE list_link_tokens (
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
        password_hash VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE notifications (
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
    CREATE TABLE user_notification_prefs (
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
    CREATE TABLE items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
        priority_id UUID REFERENCES priorities(id) ON DELETE SET NULL,
        suggested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_hidden_idea BOOLEAN DEFAULT FALSE,
        is_suggestion BOOLEAN DEFAULT FALSE,
        category VARCHAR(100) DEFAULT 'uncategorized',
        priority INTEGER DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE item_audiences (
        item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (item_id, user_id)
    )
  `;

  await dbSql`
    CREATE INDEX idx_item_audiences_user_id ON item_audiences(user_id)
  `;

  await dbSql`
    CREATE TABLE item_links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        item_id UUID REFERENCES items(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        retailer_name VARCHAR(100),
        extracted_price DECIMAL(10, 2),
        extracted_image_url TEXT
    )
  `;

  await dbSql`
    CREATE TABLE claims (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        item_id UUID REFERENCES items(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2),
        claimed_by_name VARCHAR(100),
        anonymous BOOLEAN DEFAULT FALSE,
        quantity INTEGER DEFAULT 1 NOT NULL,
        selection VARCHAR(255) DEFAULT NULL,
        claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        commenter_name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_owner_visible BOOLEAN DEFAULT TRUE,
        is_rollover BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        image_url TEXT DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE comment_reactions (
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
    CREATE TABLE item_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        item_id UUID UNIQUE NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        summary TEXT,
        pros TEXT[] NOT NULL DEFAULT '{}',
        cons TEXT[] NOT NULL DEFAULT '{}',
        reviews JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await dbSql`
    CREATE TABLE item_field_definitions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category VARCHAR(255) NOT NULL,
        field_key VARCHAR(255) NOT NULL,
        label VARCHAR(255) NOT NULL,
        placeholder VARCHAR(255),
        display_order INTEGER NOT NULL DEFAULT 0,
        UNIQUE(category, field_key)
    )
  `;

  await dbSql`
    CREATE TABLE item_field_dependencies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        dependent_field_id UUID NOT NULL REFERENCES item_field_definitions(id) ON DELETE CASCADE,
        trigger_field_key VARCHAR(255) NOT NULL,
        trigger_value VARCHAR(255) NOT NULL,
        UNIQUE(dependent_field_id, trigger_field_key, trigger_value)
    )
  `;

  console.log('[INFO] Seeding initial dynamic fields...');
  // Seed clothing fields
  const [pants] = await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'pantsSize', 'Pants Size', 'e.g. 32x30', 1)
    RETURNING id;
  `;

  const [waistFit] = await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'waistFit', 'Waist Fit', 'e.g. Slim, Regular, Relaxed', 2)
    RETURNING id;
  `;

  await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'shirtSize', 'Shirt Size', 'e.g. Medium, 15.5', 3);
  `;

  await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'shoesSize', 'Shoes Size', 'e.g. 10.5', 4);
  `;

  await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'socksSize', 'Socks Size', 'e.g. 9-11', 5);
  `;

  await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'preferredColor', 'Preferred Color', 'e.g. Navy Blue, Matte Black', 6);
  `;

  // Seed tech fields
  const [model] = await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('tech', 'modelNumber', 'Model / Version', 'e.g. iPhone 15 Pro', 1)
    RETURNING id;
  `;

  const [storage] = await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('tech', 'storageCapacity', 'Storage Capacity', 'e.g. 256GB, 1TB', 2)
    RETURNING id;
  `;

  await dbSql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('tech', 'preferredColor', 'Preferred Color', 'e.g. Space Gray, Silver', 3);
  `;

  // Seed dependencies
  await dbSql`
    INSERT INTO item_field_dependencies (dependent_field_id, trigger_field_key, trigger_value)
    VALUES (${waistFit.id}, 'pantsSize', 'any');
  `;

  await dbSql`
    INSERT INTO item_field_dependencies (dependent_field_id, trigger_field_key, trigger_value)
    VALUES (${storage.id}, 'modelNumber', 'any');
  `;

  console.log('[INFO] Database schema initialization and seeding completed successfully!');
}
