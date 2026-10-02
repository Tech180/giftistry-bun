import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { CorpusExpected } from '../interfaces/corpus-expected.interface';
import type { CorpusEntry } from '../interfaces/corpus-entry.interface';
import type { CorpusEntryMeta } from '../interfaces/corpus-entry-meta.interface';

const PAGE_FILE = 'page.html';
const META_FILE = 'meta.json';
const EXPECTED_FILE = 'expected.json';

function readEntryDir(entryDir: string, entryId: string): CorpusEntry | null {
  const pagePath = join(entryDir, PAGE_FILE);
  const metaPath = join(entryDir, META_FILE);
  const expectedPath = join(entryDir, EXPECTED_FILE);
  if (!existsSync(pagePath) || !existsSync(metaPath) || !existsSync(expectedPath)) {
    return null;
  }
  const rawMeta = JSON.parse(readFileSync(metaPath, 'utf8')) as Omit<CorpusEntryMeta, 'id'> & {
    id?: string;
  };
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as CorpusExpected;
  const url = rawMeta.finalUrl ?? rawMeta.url;
  const meta: CorpusEntryMeta = {
    ...rawMeta,
    id: rawMeta.id ?? entryId,
    url,
  };
  const html = readFileSync(pagePath, 'utf8');
  return { meta, expected, html, pagePath };
}

export function loadCorpusEntries(corpusRoot: string): CorpusEntry[] {
  if (!existsSync(corpusRoot)) {
    return [];
  }

  const entries: CorpusEntry[] = [];
  for (const name of readdirSync(corpusRoot)) {
    if (name.startsWith('.') || name.endsWith('.json')) {
      continue;
    }
    const full = join(corpusRoot, name);
    if (!statSync(full).isDirectory()) {
      continue;
    }
    const entry = readEntryDir(full, name);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries.sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}
