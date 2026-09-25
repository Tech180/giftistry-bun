import { afterEach, describe, expect, test } from 'bun:test';
import { getEnv, loadRuntimeConfig, setEnvForTests } from '@/common/consts/runtime-config';
import {
  getPublicAppUrl,
  setPublicAppUrlConfigSource,
} from './public-app-url.util';

describe('getPublicAppUrl', () => {
  afterEach(() => {
    setPublicAppUrlConfigSource(() => undefined);
    setEnvForTests(null);
  });

  test('prefers config over env when both are set', () => {
    setEnvForTests({
      ...loadRuntimeConfig(),
      GIFTISTRY_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    setPublicAppUrlConfigSource(() => 'https://gifts.example.com/');

    expect(getPublicAppUrl()).toBe('https://gifts.example.com');
  });

  test('uses env when config is unset', () => {
    setEnvForTests({
      ...loadRuntimeConfig(),
      GIFTISTRY_PUBLIC_APP_URL: 'https://from-env.example.com/',
    });
    setPublicAppUrlConfigSource(() => undefined);

    expect(getPublicAppUrl()).toBe('https://from-env.example.com');
  });

  test('uses env when config is blank', () => {
    setEnvForTests({
      ...loadRuntimeConfig(),
      GIFTISTRY_PUBLIC_APP_URL: 'https://from-env.example.com',
    });
    setPublicAppUrlConfigSource(() => '   ');

    expect(getPublicAppUrl()).toBe('https://from-env.example.com');
  });

  test('falls back to localhost in non-production when config and env are unset', () => {
    setEnvForTests({
      ...loadRuntimeConfig(),
      isProduction: false,
      GIFTISTRY_PUBLIC_APP_URL: undefined,
    });
    setPublicAppUrlConfigSource(() => undefined);

    expect(getPublicAppUrl()).toBe('http://localhost:3000');
  });

  test('returns empty string in production when config and env are unset', () => {
    const base = getEnv();
    setEnvForTests({
      ...base,
      isProduction: true,
      GIFTISTRY_PUBLIC_APP_URL: undefined,
    });
    setPublicAppUrlConfigSource(() => undefined);

    expect(getPublicAppUrl()).toBe('');
  });
});
