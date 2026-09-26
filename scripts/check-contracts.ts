/**
 * Contract layout checker.
 *
 * Flags:
 * - Multiple exported interfaces/types in one non-interfaces file
 * - Exported const object tables outside constants/ files
 * - `*.util.ts` files outside a `utils/` directory
 * - `*.use-case.ts` / `*.use-cases.ts` files outside a `use-cases/` directory
 *
 * Set STRICT=1 or pass --strict to exit 1 on violations. Default: warn only.
 *
 * Exemptions (documented):
 * - Composition / barrels / modules / routes / presentation (wiring, not contracts)
 * - ports/, *.port|entity|vo|event|interface|type.ts (already typed modules)
 * - constants/ and *.constant.ts (lookup tables)
 * - modules/.../domain/packs/packs/ — static pack catalogs (const object tables by design)
 * - common/config/** — runtime env/secrets loader (may export types inline)
 * - common/utils/** — shared cross-cutting utils (may export helper types inline)
 * - common/domain/errors/** — shared domain error helpers
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, basename } from 'path';

const SRC = join(import.meta.dir, '..', 'src');
const STRICT = process.env.STRICT === '1' || process.argv.includes('--strict');

const EXPORTED_INTERFACE = /^export\s+(?:interface|type)\s+\w+/gm;
const EXPORTED_CONST_OBJECT =
  /^export\s+const\s+[A-Z][A-Z0-9_]*\s*(?::[^=]+)?=\s*\{/gm;

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts') && !full.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

function isInterfacesPath(rel: string): boolean {
  return (
    rel.includes('/interfaces/') ||
    rel.includes('/ports/') ||
    /\.interface\.ts$/.test(rel) ||
    /\.type\.ts$/.test(rel) ||
    /\.port\.ts$/.test(rel) ||
    /\.entity\.ts$/.test(rel) ||
    /\.vo\.ts$/.test(rel) ||
    /\.event\.ts$/.test(rel)
  );
}

function isConstantsPath(rel: string): boolean {
  return rel.includes('/constants/') || /\.constant\.ts$/.test(rel);
}

function isMisplacedUtil(rel: string): boolean {
  return /\.util\.ts$/.test(rel) && !rel.includes('/utils/');
}

function isMisplacedUseCase(rel: string): boolean {
  return (
    (/\.use-case\.ts$/.test(rel) || /\.use-cases\.ts$/.test(rel)) &&
    !rel.includes('/use-cases/')
  );
}

function isExempt(rel: string): boolean {
  return (
    rel === 'app.container.ts' ||
    rel === 'index.ts' ||
    rel === 'worker.ts' ||
    rel.startsWith('boot/') ||
    basename(rel) === 'index.ts' ||
    rel.endsWith('.module.ts') ||
    rel.endsWith('.routes.ts') ||
    rel.includes('/presentation/') ||
    // Static pack catalogs (const object tables by design)
    /\/domain\/packs\/packs\//.test(rel) ||
    rel.startsWith('common/config/') ||
    rel.startsWith('common/utils/') ||
    rel.startsWith('common/domain/errors/')
  );
}

const warnings: string[] = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  if (isExempt(rel)) continue;

  const content = readFileSync(file, 'utf-8');

  if (isMisplacedUtil(rel)) {
    warnings.push(
      `${rel}: util file outside utils/ (move to <layer>/utils/<name>.util.ts)`
    );
  }

  if (isMisplacedUseCase(rel)) {
    warnings.push(
      `${rel}: use-case file outside use-cases/ (move to <layer>/use-cases/<name>.use-case.ts)`
    );
  }

  if (!isInterfacesPath(rel)) {
    const ifaceMatches = content.match(EXPORTED_INTERFACE) ?? [];
    if (ifaceMatches.length > 1) {
      warnings.push(
        `${rel}: exports ${ifaceMatches.length} interfaces/types (prefer one per interfaces/*.interface.ts or *.type.ts)`
      );
    } else if (ifaceMatches.length === 1 && !/\.(entity|vo|event|port)\.ts$/.test(rel)) {
      warnings.push(
        `${rel}: exports an interface/type outside interfaces/ (move to interfaces/<name>.interface.ts)`
      );
    }
  }

  if (!isConstantsPath(rel)) {
    const constMatches = content.match(EXPORTED_CONST_OBJECT) ?? [];
    if (constMatches.length > 0) {
      warnings.push(
        `${rel}: exports ${constMatches.length} const object table(s) outside constants/ (prefer constants/<topic>.constant.ts)`
      );
    }
  }
}

if (warnings.length > 0) {
  const label = STRICT ? 'Contract violations' : 'Contract warnings (non-strict)';
  console[STRICT ? 'error' : 'warn'](`${label}:`);
  for (const w of warnings) {
    console[STRICT ? 'error' : 'warn'](`  - ${w}`);
  }
  if (STRICT) {
    process.exit(1);
  }
} else {
  console.log('OK: contract layout clean');
}
