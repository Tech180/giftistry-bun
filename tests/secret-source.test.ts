import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, test, afterEach } from 'bun:test';
import { CompositeSecretSource } from '@/common/infrastructure/secrets/composite-secret.source';
import { CredentialsDirectoryProvider } from '@/common/infrastructure/secrets/credentials-directory.provider';
import { EnvSecretProvider } from '@/common/infrastructure/secrets/env-secret.provider';
import { FileEnvSecretProvider } from '@/common/infrastructure/secrets/file-env-secret.provider';
import { loadRuntimeConfig } from '@/common/consts/env.consts';
import type { SecretSource } from '@/common/domain/ports/secret-source.port';

const saved: Record<string, string | undefined> = {};

function stashEnv(keys: string[]) {
  for (const key of keys) {
    saved[key] = Bun.env[key];
  }
}

function restoreEnv(keys: string[]) {
  for (const key of keys) {
    const previous = saved[key];
    if (previous === undefined) {
      delete Bun.env[key];
    } else {
      Bun.env[key] = previous;
    }
  }
}

describe('SecretSource providers', () => {
  const keys = [
    'JWT_SECRET',
    'JWT_SECRET_FILE',
    'CREDENTIALS_DIRECTORY',
    'GIFTISTRY_CREDENTIALS_DIRECTORY',
    'NODE_ENV',
  ];

  afterEach(() => {
    restoreEnv(keys);
  });

  test('EnvSecretProvider reads trimmed Bun.env', () => {
    stashEnv(keys);
    Bun.env.JWT_SECRET = '  env-secret-value  ';
    const provider = new EnvSecretProvider();
    expect(provider.get('JWT_SECRET')).toBe('env-secret-value');
  });

  test('FileEnvSecretProvider reads NAME_FILE path', () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-secrets-'));
    const file = join(dir, 'jwt');
    writeFileSync(file, 'file-secret\n');
    Bun.env.JWT_SECRET_FILE = file;
    delete Bun.env.JWT_SECRET;
    try {
      const provider = new FileEnvSecretProvider();
      expect(provider.get('JWT_SECRET')).toBe('file-secret');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('CredentialsDirectoryProvider reads DIR/NAME', () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-creds-'));
    writeFileSync(join(dir, 'JWT_SECRET'), 'cred-secret');
    Bun.env.CREDENTIALS_DIRECTORY = dir;
    delete Bun.env.JWT_SECRET;
    delete Bun.env.JWT_SECRET_FILE;
    try {
      const provider = new CredentialsDirectoryProvider();
      expect(provider.get('JWT_SECRET')).toBe('cred-secret');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('Composite: env overrides file overrides credentials dir', () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-composite-'));
    writeFileSync(join(dir, 'JWT_SECRET'), 'from-creds');
    const file = join(dir, 'jwt_file');
    writeFileSync(file, 'from-file');
    Bun.env.CREDENTIALS_DIRECTORY = dir;
    Bun.env.JWT_SECRET_FILE = file;
    Bun.env.JWT_SECRET = 'from-env';
    try {
      const source = new CompositeSecretSource([
        new EnvSecretProvider(),
        new FileEnvSecretProvider(),
        new CredentialsDirectoryProvider(),
      ]);
      expect(source.get('JWT_SECRET')).toBe('from-env');
      delete Bun.env.JWT_SECRET;
      expect(source.get('JWT_SECRET')).toBe('from-file');
      delete Bun.env.JWT_SECRET_FILE;
      expect(source.get('JWT_SECRET')).toBe('from-creds');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('loadRuntimeConfig JWT guard', () => {
  const keys = ['NODE_ENV', 'JWT_SECRET'];

  afterEach(() => {
    restoreEnv(keys);
  });

  test('production rejects missing JWT', () => {
    stashEnv(keys);
    Bun.env.NODE_ENV = 'production';
    const secrets: SecretSource = { get: () => undefined };
    expect(() => loadRuntimeConfig(secrets)).toThrow(/JWT_SECRET is required/);
  });

  test('production rejects short JWT', () => {
    stashEnv(keys);
    Bun.env.NODE_ENV = 'production';
    const secrets: SecretSource = { get: () => 'too-short' };
    expect(() => loadRuntimeConfig(secrets)).toThrow(/at least 32 characters/);
  });

  test('production accepts strong JWT', () => {
    stashEnv(keys);
    Bun.env.NODE_ENV = 'production';
    const strong = 'a'.repeat(32);
    const secrets: SecretSource = { get: (name) => (name === 'JWT_SECRET' ? strong : undefined) };
    const config = loadRuntimeConfig(secrets);
    expect(config.JWT_SECRET).toBe(strong);
  });

  test('development allows default JWT', () => {
    stashEnv(keys);
    Bun.env.NODE_ENV = 'development';
    const secrets: SecretSource = { get: () => undefined };
    const config = loadRuntimeConfig(secrets);
    expect(config.JWT_SECRET).toBe('local_secret_key_for_giftistry');
  });
});
