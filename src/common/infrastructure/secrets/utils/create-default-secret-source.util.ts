import type { SecretSource } from '@/common/domain/ports/secret-source.port';
import { CredentialsDirectoryProvider } from '../providers/credentials-directory.provider';
import { EnvSecretProvider } from '../providers/env-secret.provider';
import { FileEnvSecretProvider } from '../providers/file-env-secret.provider';
import { CompositeSecretSource } from '../sources/composite-secret.source';

/** Env overrides file overrides credentials-dir (first non-empty wins). */
export function createDefaultSecretSource(): SecretSource {
  return new CompositeSecretSource([
    new EnvSecretProvider(),
    new FileEnvSecretProvider(),
    new CredentialsDirectoryProvider(),
  ]);
}
