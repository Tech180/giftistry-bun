import { describe, expect, test } from 'bun:test';
import { APP_DISPLAY_NAME } from '../../../domain/constants/app-display-name.constant';
import { generateTotpSetup } from './generate-totp-setup.util';

describe('generateTotpSetup', () => {
  test('returns secret and otpauth URI with app issuer', () => {
    const result = generateTotpSetup('user@example.com');
    expect(result.secret).toBeTruthy();
    expect(result.otpAuthUri).toMatch(/^otpauth:\/\//);
    expect(result.otpAuthUri).toContain(APP_DISPLAY_NAME);
    expect(result.otpAuthUri).toContain('user%40example.com');
  });
});
