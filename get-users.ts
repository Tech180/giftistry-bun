import { sql } from './src/common/database/connection';
import fs from 'fs';
try {
  const users = await sql`SELECT id, username, first_name, last_name, avatar FROM users`;
  fs.writeFileSync('users-db.txt', JSON.stringify(users, null, 2));
  console.log("Wrote users-db.txt successfully");
} catch (err) {
  console.error("DB Query failed:", err);
}
process.exit(0);
