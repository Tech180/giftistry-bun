import { readFileSync } from 'fs';
import type { SecretName, SecretSource } from '@/common/domain/ports/secret-source.port';

/**
 * If Bun.env[`${NAME}_FILE`] is set, read that path (Docker/Swarm secrets, systemd credentials paths).
 */
export class FileEnvSecretProvider implements SecretSource {
  get(name: SecretName): string | undefined {
    const filePath = Bun.env[`${name}_FILE`];
    if (!filePath || !String(filePath).trim()) return undefined;
    try {
      const content = readFileSync(String(filePath).trim(), 'utf-8');
      const trimmed = content.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    } catch {
      return undefined;
    }
  }
}
