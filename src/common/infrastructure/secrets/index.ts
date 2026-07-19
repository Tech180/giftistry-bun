import type { SecretSource } from '@/common/domain/ports/secret-source.port';
import { CompositeSecretSource } from './composite-secret.source';
import { CredentialsDirectoryProvider } from './credentials-directory.provider';
import { EnvSecretProvider } from './env-secret.provider';
import { FileEnvSecretProvider } from './file-env-secret.provider';

let cached: SecretSource | null = null;

/** Env overrides file overrides credentials-dir (first non-empty wins). */
export function createDefaultSecretSource(): SecretSource {
  return new CompositeSecretSource([
    new EnvSecretProvider(),
    new FileEnvSecretProvider(),
    new CredentialsDirectoryProvider(),
  ]);
}

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
