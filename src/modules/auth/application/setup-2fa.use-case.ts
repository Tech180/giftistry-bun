import { generateSecret, generateURI } from 'otplib';

export class Setup2faUseCase {
  async execute(email: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const secret = generateSecret();
    const otpauth = generateURI({ label: email, issuer: 'Giftistry', secret });
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
    return { secret, qrCodeUrl };
  }
}
