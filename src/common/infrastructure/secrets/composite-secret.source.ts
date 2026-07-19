import type { SecretName, SecretSource } from '@/common/domain/ports/secret-source.port';

/**
 * Precedence: first provider that returns a non-empty value wins.
 * Wire as [Env, FileEnv, CredentialsDir] so plain env overrides files.
 */
export class CompositeSecretSource implements SecretSource {
  constructor(private readonly providers: SecretSource[]) {}

  get(name: SecretName): string | undefined {
    for (const provider of this.providers) {
      const value = provider.get(name);
      if (value !== undefined) return value;
    }
    return undefined;
  }
}
