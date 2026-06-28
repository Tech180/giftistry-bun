import { sql } from './connection';

async function main() {
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
    console.log('Columns in users table:');
    console.log(cols);
  } catch (err) {
    console.error('Error querying columns:', err);
  } finally {
    await sql.end();
  }
}

main();
