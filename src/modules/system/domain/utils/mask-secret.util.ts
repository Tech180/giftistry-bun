import { MASKED_SECRET } from '../constants/masked-secret.constant';

export function maskSecret(value?: string): string {
  return value ? MASKED_SECRET : '';
}
