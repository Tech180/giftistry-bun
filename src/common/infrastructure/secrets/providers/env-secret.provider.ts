import type { SecretName, SecretSource } from '@/common/domain/ports/secret-source.port';

/** Reads Bun.env[NAME]. First non-empty wins when composed after other providers that return undefined. */
export class EnvSecretProvider implements SecretSource {
  get(name: SecretName): string | undefined {
    const value = Bun.env[name];
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
