export interface CorpusEntryMeta {
  id: string;
  url: string;
  finalUrl?: string;
  platform: string;
  tags?: string[];
  status?: number;
  fetchedAt?: string;
  tier?: string;
}
