import type { BackgroundJobItem } from '../../../domain/interfaces/background-job-item.interface';
import { importItemDedupeKey } from './import-item-dedupe-key.util';

export function jobItemDedupeKey(item: BackgroundJobItem): string {
  const payload = item.Payload || {};
  const name = String(payload.name ?? '');
  const linkUrl = String(payload.linkUrl ?? item.LinkUrl ?? '');
  return importItemDedupeKey(name, linkUrl);
}
