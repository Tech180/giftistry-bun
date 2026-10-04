import { isPopulatedExportString } from './is-populated-export-string.util';

export function appendMdMetaBullet(blocks: string[], label: string, value: string): void {
  if (!isPopulatedExportString(value)) {
    return;
  }
  blocks.push(`- ${label}: ${value.trim()}`);
}
