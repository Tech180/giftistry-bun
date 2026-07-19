import { readFileSync } from 'fs';
import { join } from 'path';
import type { SecretName, SecretSource } from '@/common/domain/ports/secret-source.port';

/**
 * Reads `$CREDENTIALS_DIRECTORY/NAME` or `$GIFTISTRY_CREDENTIALS_DIRECTORY/NAME`
 * (systemd LoadCredential, Docker /run/secrets when CREDENTIALS_DIRECTORY is set).
 */
export class CredentialsDirectoryProvider implements SecretSource {
  get(name: SecretName): string | undefined {
    const dir =
      Bun.env.GIFTISTRY_CREDENTIALS_DIRECTORY?.trim() ||
      Bun.env.CREDENTIALS_DIRECTORY?.trim();
    if (!dir) return undefined;
    try {
      const content = readFileSync(join(dir, name), 'utf-8');
      const trimmed = content.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    } catch {
      return undefined;
    }
  }
}
