import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, test } from 'bun:test';
import { loadRuntimeConfig } from '@/common/config/runtime-config';
import type { SecretSource } from '@/common/domain/ports/secret-source.port';
import { CompositeSecretSource } from '@/common/infrastructure/secrets/sources/composite-secret.source';
import { CredentialsDirectoryProvider } from '@/common/infrastructure/secrets/providers/credentials-directory.provider';
import { ensurePersistedJwtSecret } from '@/common/infrastructure/secrets/ensure-jwt-secret';
import { EnvSecretProvider } from '@/common/infrastructure/secrets/providers/env-secret.provider';
import { FileEnvSecretProvider } from '@/common/infrastructure/secrets/providers/file-env-secret.provider';

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

describe('ensurePersistedJwtSecret', () => {
  const keys = [
    'GIFTISTRY_STATE_DIR',
    'GIFTISTRY_JWT_SECRET_PATH',
    'GIFTISTRY_AUTO_JWT_SECRET',
    'JWT_SECRET',
  ];

  afterEach(() => {
    restoreEnv(keys);
  });

  test('returns explicit secret without creating a file', () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-jwt-explicit-'));
    Bun.env.GIFTISTRY_STATE_DIR = dir;
    delete Bun.env.GIFTISTRY_AUTO_JWT_SECRET;
    try {
      const value = ensurePersistedJwtSecret('explicit-secret-value-at-least-32-chars!!');
      expect(value).toBe('explicit-secret-value-at-least-32-chars!!');
      expect(existsSync(join(dir, 'jwt_secret'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('generates and persists when missing', () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-jwt-gen-'));
    Bun.env.GIFTISTRY_STATE_DIR = dir;
    delete Bun.env.GIFTISTRY_AUTO_JWT_SECRET;
    try {
      const first = ensurePersistedJwtSecret(undefined);
      expect(first).toBeDefined();
      expect(first!.length).toBeGreaterThanOrEqual(32);
      const path = join(dir, 'jwt_secret');
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, 'utf-8').trim()).toBe(first);
      const second = ensurePersistedJwtSecret(undefined);
      expect(second).toBe(first);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('concurrent wx race ends with identical secret', async () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-jwt-race-'));
    Bun.env.GIFTISTRY_STATE_DIR = dir;
    delete Bun.env.GIFTISTRY_AUTO_JWT_SECRET;
    try {
      const results = await Promise.all([
        Promise.resolve(ensurePersistedJwtSecret(undefined)),
        Promise.resolve(ensurePersistedJwtSecret(undefined)),
        Promise.resolve(ensurePersistedJwtSecret(undefined)),
      ]);
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(readFileSync(join(dir, 'jwt_secret'), 'utf-8').trim()).toBe(results[0]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('auto disabled returns undefined', () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-jwt-off-'));
    Bun.env.GIFTISTRY_STATE_DIR = dir;
    Bun.env.GIFTISTRY_AUTO_JWT_SECRET = 'false';
    try {
      expect(ensurePersistedJwtSecret(undefined)).toBeUndefined();
      expect(existsSync(join(dir, 'jwt_secret'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('loadRuntimeConfig JWT guard', () => {
  const keys = [
    'NODE_ENV',
    'JWT_SECRET',
    'GIFTISTRY_STATE_DIR',
    'GIFTISTRY_JWT_SECRET_PATH',
    'GIFTISTRY_AUTO_JWT_SECRET',
  ];

  afterEach(() => {
    restoreEnv(keys);
  });

  test('production with auto disabled rejects missing JWT', () => {
    stashEnv(keys);
    Bun.env.NODE_ENV = 'production';
    Bun.env.GIFTISTRY_AUTO_JWT_SECRET = 'false';
    delete Bun.env.GIFTISTRY_STATE_DIR;
    const secrets: SecretSource = { get: () => undefined };
    expect(() => loadRuntimeConfig(secrets)).toThrow(/JWT_SECRET is required/);
  });

  test('production auto-generates JWT when unset', () => {
    stashEnv(keys);
    const dir = mkdtempSync(join(tmpdir(), 'giftistry-jwt-boot-'));
    Bun.env.NODE_ENV = 'production';
    Bun.env.GIFTISTRY_STATE_DIR = dir;
    delete Bun.env.GIFTISTRY_AUTO_JWT_SECRET;
    delete Bun.env.JWT_SECRET;
    const secrets: SecretSource = { get: () => undefined };
    try {
      const config = loadRuntimeConfig(secrets);
      expect(config.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
      expect(readFileSync(join(dir, 'jwt_secret'), 'utf-8').trim()).toBe(config.JWT_SECRET);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('production rejects short JWT', () => {
    stashEnv(keys);
    Bun.env.NODE_ENV = 'production';
    Bun.env.GIFTISTRY_AUTO_JWT_SECRET = 'false';
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
