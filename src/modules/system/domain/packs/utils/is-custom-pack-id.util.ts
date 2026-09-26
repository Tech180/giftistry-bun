import { CUSTOM_PACK_ID_PREFIX } from '../constants/custom-pack-id.constant';

export function isCustomPackId(packId: string): boolean {
  return packId.startsWith(CUSTOM_PACK_ID_PREFIX);
}
