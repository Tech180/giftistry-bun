import { CUSTOM_PACK_ID_PREFIX } from './custom-pack-id.constant';

export function isCustomPackId(packId: string): boolean {
  return packId.startsWith(CUSTOM_PACK_ID_PREFIX);
}
