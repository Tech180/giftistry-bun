import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(import.meta.dir, '..', 'src');

const DATABASE_IMPORT =
  /from\s+['"][^'"]*common\/database(?:\/[^'"]*)?['"]/;
const INFRA_IMPORT = /from\s+['"][^'"]*\/infrastructure\/[^'"]*['"]/;
const APPLICATION_IMPORT = /from\s+['"][^'"]*\/application\/[^'"]*['"]/;

/** Process entry points may ping/close the DB pool. */
const ENTRY_ALLOWLIST = new Set(['index.ts', 'worker.ts']);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

function isInfrastructure(rel: string): boolean {
  return (
    rel.includes('/infrastructure/') ||
    rel.startsWith('common/infrastructure/') ||
    rel.startsWith('common/database/') ||
    rel.startsWith('boot/')
  );
}

function isApplication(rel: string): boolean {
  return rel.includes('/application/') || rel.startsWith('common/application/');
}

function isDomain(rel: string): boolean {
  return rel.includes('/domain/') || rel.startsWith('common/domain/');
}

function isPresentation(rel: string): boolean {
  return rel.includes('/presentation/');
}

const violations: string[] = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  const content = readFileSync(file, 'utf-8');

  if (DATABASE_IMPORT.test(content)) {
    const allowed =
      isInfrastructure(rel) ||
      ENTRY_ALLOWLIST.has(rel) ||
      rel.startsWith('common/database/');
    if (!allowed) {
      violations.push(`${rel}: imports common/database (only infrastructure, common/database, index/worker)`);
    }
  }

  if (isApplication(rel) && INFRA_IMPORT.test(content)) {
    violations.push(`${rel}: application imports infrastructure`);
  }

  if (isDomain(rel)) {
    if (APPLICATION_IMPORT.test(content)) {
      violations.push(`${rel}: domain imports application`);
    }
    if (INFRA_IMPORT.test(content)) {
      violations.push(`${rel}: domain imports infrastructure`);
    }
  }

  if (isPresentation(rel) && DATABASE_IMPORT.test(content)) {
    // Already covered above; keep explicit for clarity in messages
  }
}

if (violations.length > 0) {
  console.error('Layer boundary violations:');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log('OK: layer boundaries hold');
