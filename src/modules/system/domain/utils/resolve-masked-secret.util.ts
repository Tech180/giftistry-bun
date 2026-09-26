import { MASKED_SECRET } from '../constants/masked-secret.constant';

export function resolveMaskedSecret(incoming: string | undefined, existing: string | undefined): string {
  if (incoming === MASKED_SECRET) {
    return existing || '';
  }
  return incoming || '';
}
