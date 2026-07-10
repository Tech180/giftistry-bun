import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(import.meta.dir, '..', 'src');
const SQL_IMPORT = /import\s*\{[^}]*\bsql\b[^}]*\}\s*from\s*['"]@\/common\/database\/connection['"]/;
const ALLOWED = /\/infrastructure\//;

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const violations: string[] = [];

for (const file of walk(SRC)) {
  const rel = file.replace(SRC + '/', '');
  if (ALLOWED.test(rel)) continue;
  if (rel.startsWith('common/database/')) continue;
  if (rel === 'index.ts') continue;

  const content = readFileSync(file, 'utf-8');
  if (SQL_IMPORT.test(content)) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error('SQL imports found outside infrastructure/:');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log('OK: no sql imports outside infrastructure/');
