import { generateSecret, generateURI } from 'otplib';
import { APP_DISPLAY_NAME } from '../../../domain/constants/app-display-name.constant';

export function generateTotpSetup(label: string): { secret: string; otpAuthUri: string } {
  const secret = generateSecret();
  const otpAuthUri = generateURI({ label, issuer: APP_DISPLAY_NAME, secret });
  return { secret, otpAuthUri };
}
