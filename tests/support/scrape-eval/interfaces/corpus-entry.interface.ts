import type { CorpusExpected } from './corpus-expected.interface';
import type { CorpusEntryMeta } from './corpus-entry-meta.interface';

export interface CorpusEntry {
  meta: CorpusEntryMeta;
  expected: CorpusExpected;
  html: string;
  pagePath: string;
}
