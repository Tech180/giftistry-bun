import type { SecretSource } from '@/common/domain/ports/secret-source.port';
import { createDefaultSecretSource } from './create-default-secret-source.util';

let cached: SecretSource | null = null;

export function getSecretSource(): SecretSource {
  if (!cached) {
    cached = createDefaultSecretSource();
  }
  return cached;
}

/** Test helper to inject a fake SecretSource. */
export function setSecretSourceForTests(source: SecretSource | null): void {
  cached = source;
}
