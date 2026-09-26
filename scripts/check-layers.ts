import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(import.meta.dir, '..', 'src');

const DATABASE_IMPORT =
  /from\s+['"][^'"]*common\/database(?:\/[^'"]*)?['"]/;
const INFRA_IMPORT = /from\s+['"][^'"]*\/infrastructure\/[^'"]*['"]/;
const APPLICATION_IMPORT = /from\s+['"][^'"]*\/(?:application|slices)\/[^'"]*['"]/;
/** Cross-module deep import (not via index.ts). Warn-only unless STRICT_MODULES=1. */
const CROSS_MODULE_DEEP =
  /from\s+['"]@\/modules\/([a-z0-9-]+)\/(?!index(?:\.ts)?['"])([^'"]+)['"]/g;

const STRICT_MODULES =
  process.env.STRICT_MODULES === '1' || process.argv.includes('--strict-modules');

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
  return (
    rel.includes('/application/') ||
    rel.includes('/slices/') ||
    rel.startsWith('common/application/')
  );
}

function isDomain(rel: string): boolean {
  return rel.includes('/domain/') || rel.startsWith('common/domain/');
}

function isPresentation(rel: string): boolean {
  return rel.includes('/presentation/');
}

function moduleOf(rel: string): string | null {
  const m = rel.match(/^modules\/([a-z0-9-]+)\//);
  return m?.[1] ?? null;
}

const violations: string[] = [];
const moduleWarnings: string[] = [];

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
    violations.push(`${rel}: application/slices imports infrastructure`);
  }

  if (isDomain(rel)) {
    if (APPLICATION_IMPORT.test(content)) {
      violations.push(`${rel}: domain imports application/slices`);
    }
    if (INFRA_IMPORT.test(content)) {
      violations.push(`${rel}: domain imports infrastructure`);
    }
  }

  if (isPresentation(rel) && DATABASE_IMPORT.test(content)) {
    // Already covered above; keep explicit for clarity in messages
  }

  const fromModule = moduleOf(rel);
  const compositionRoot =
    rel === 'app.container.ts' ||
    rel.startsWith('boot/') ||
    ENTRY_ALLOWLIST.has(rel);

  if (!compositionRoot && fromModule) {
    CROSS_MODULE_DEEP.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CROSS_MODULE_DEEP.exec(content)) !== null) {
      const targetModule = match[1];
      if (targetModule && targetModule !== fromModule) {
        const msg = `${rel}: deep-imports @/modules/${targetModule}/${match[2]} (use @/modules/${targetModule} barrel)`;
        if (STRICT_MODULES) {
          violations.push(msg);
        } else {
          moduleWarnings.push(msg);
        }
      }
    }
  }
}

if (moduleWarnings.length > 0) {
  console.warn(`Cross-module deep imports (warn; set STRICT_MODULES=1 to fail): ${moduleWarnings.length}`);
  for (const w of moduleWarnings.slice(0, 40)) {
    console.warn(`  - ${w}`);
  }
  if (moduleWarnings.length > 40) {
    console.warn(`  ... and ${moduleWarnings.length - 40} more`);
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
