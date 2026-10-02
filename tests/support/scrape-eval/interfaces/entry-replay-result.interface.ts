import type { FieldMatchResult } from './field-match-result.interface';
import type { CorpusEntryMeta } from './corpus-entry-meta.interface';

export interface EntryReplayResult {
  id: string;
  platform: string;
  tags: string[];
  url: string;
  validation: {
    valid: boolean;
    blocked?: boolean;
    reason?: string;
    confidence?: string;
  };
  blockedExpectationMet?: boolean;
  fields: FieldMatchResult[];
}
