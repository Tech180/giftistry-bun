import { describe, expect, test } from 'bun:test';
import { AppError } from '@/common/domain/errors/app-error';
import { webAuthnRpIdFromPublicAppUrl } from './webauthn-rp-id.util';

describe('webAuthnRpIdFromPublicAppUrl', () => {
  test('extracts hostname from https URL with path', () => {
    expect(webAuthnRpIdFromPublicAppUrl('https://giftistry.example.com/path')).toBe(
      'giftistry.example.com'
    );
  });

  test('extracts localhost from http URL with port', () => {
    expect(webAuthnRpIdFromPublicAppUrl('http://localhost:3000')).toBe('localhost');
  });

  test('accepts *.localhost hostnames', () => {
    expect(webAuthnRpIdFromPublicAppUrl('http://app.localhost:3000')).toBe('app.localhost');
  });

  test('lowercases hostname', () => {
    expect(webAuthnRpIdFromPublicAppUrl('https://Giftistry.Example.COM')).toBe(
      'giftistry.example.com'
    );
  });

  test('throws for empty URL', () => {
    expect(() => webAuthnRpIdFromPublicAppUrl('')).toThrow(AppError);
    expect(() => webAuthnRpIdFromPublicAppUrl('   ')).toThrow(AppError);
  });

  test('throws for unparseable URL', () => {
    expect(() => webAuthnRpIdFromPublicAppUrl('not a url')).toThrow(AppError);
  });

  test('throws for IPv4 addresses', () => {
    expect(() => webAuthnRpIdFromPublicAppUrl('http://127.0.0.1:3000')).toThrow(AppError);
    expect(() => webAuthnRpIdFromPublicAppUrl('http://192.168.1.10:3000')).toThrow(AppError);
  });

  test('throws for IPv6 addresses', () => {
    expect(() => webAuthnRpIdFromPublicAppUrl('http://[::1]:3000')).toThrow(AppError);
  });
});
