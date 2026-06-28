import { sql } from './connection';

export async function up() {
  console.log('[INFO] Running migrations for dynamic item fields...');

  // Add fields to users table
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(255) DEFAULT 'default';
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;
  `;
  await sql`
    ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;
  `;


  // 0. Add Category to lists table
  await sql`
    ALTER TABLE lists ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'generic';
  `;

  // 0b. Add reveal_suggestions to lists table
  await sql`
    ALTER TABLE lists ADD COLUMN IF NOT EXISTS reveal_suggestions BOOLEAN DEFAULT TRUE;
  `;

  // 0c. Add is_suggestion to items table
  await sql`
    ALTER TABLE items ADD COLUMN IF NOT EXISTS is_suggestion BOOLEAN DEFAULT FALSE;
  `;

  // 0d. Add anonymous to claims table
  await sql`
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT FALSE;
  `;

  // 0f. Add quantity and selection to claims table
  await sql`
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 NOT NULL;
  `;
  await sql`
    ALTER TABLE claims ADD COLUMN IF NOT EXISTS selection VARCHAR(255) DEFAULT NULL;
  `;

  // 0e. Add is_deleted to comments table
  await sql`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
  `;

  // 0g. Add priority to items table
  await sql`
    ALTER TABLE items ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT NULL;
  `;

  // 1. Create Definitions Table
  await sql`
    CREATE TABLE IF NOT EXISTS item_field_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category VARCHAR(255) NOT NULL,
      field_key VARCHAR(255) NOT NULL,
      label VARCHAR(255) NOT NULL,
      placeholder VARCHAR(255),
      display_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(category, field_key)
    );
  `;

  // 2. Create Dependencies Table
  await sql`
    CREATE TABLE IF NOT EXISTS item_field_dependencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dependent_field_id UUID NOT NULL REFERENCES item_field_definitions(id) ON DELETE CASCADE,
      trigger_field_key VARCHAR(255) NOT NULL,
      trigger_value VARCHAR(255) NOT NULL,
      UNIQUE(dependent_field_id, trigger_field_key, trigger_value)
    );
  `;

  console.log('[INFO] Tables created. Seeding initial dynamic fields...');

  // 3. Clear existing definitions to avoid duplicates during re-runs
  await sql`TRUNCATE item_field_definitions CASCADE;`;

  // 4. Seed Clothing fields
  const [pants] = await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'pantsSize', 'Pants Size', 'e.g. 32x30', 1)
    RETURNING id;
  `;

  const [waistFit] = await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'waistFit', 'Waist Fit', 'e.g. Slim, Regular, Relaxed', 2)
    RETURNING id;
  `;

  await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'shirtSize', 'Shirt Size', 'e.g. Medium, 15.5', 3);
  `;

  await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'shoesSize', 'Shoes Size', 'e.g. 10.5', 4);
  `;

  await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'socksSize', 'Socks Size', 'e.g. 9-11', 5);
  `;

  await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('clothing', 'preferredColor', 'Preferred Color', 'e.g. Navy Blue, Matte Black', 6);
  `;

  // 5. Seed Tech fields
  const [model] = await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('tech', 'modelNumber', 'Model / Version', 'e.g. iPhone 15 Pro', 1)
    RETURNING id;
  `;

  const [storage] = await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('tech', 'storageCapacity', 'Storage Capacity', 'e.g. 256GB, 1TB', 2)
    RETURNING id;
  `;

  await sql`
    INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
    VALUES ('tech', 'preferredColor', 'Preferred Color', 'e.g. Space Gray, Silver', 3);
  `;

  // 6. Seed Dependencies
  // waistFit depends on pantsSize having value 'any'
  await sql`
    INSERT INTO item_field_dependencies (dependent_field_id, trigger_field_key, trigger_value)
    VALUES (${waistFit.id}, 'pantsSize', 'any');
  `;

  // storageCapacity depends on modelNumber having value 'any'
  await sql`
    INSERT INTO item_field_dependencies (dependent_field_id, trigger_field_key, trigger_value)
    VALUES (${storage.id}, 'modelNumber', 'any');
  `;

  console.log('[INFO] Migration and seeding completed successfully!');
}

if (require.main === module || (import.meta.url && import.meta.url.includes(process.argv[1]))) {
  up().then(() => process.exit(0)).catch((err) => {
    console.error('[ERROR] Migration failed:', err);
    process.exit(1);
  });
}
