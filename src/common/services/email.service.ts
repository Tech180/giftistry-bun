export { SmtpEmailAdapter as SmtpEmailService } from '@/modules/auth/infrastructure/smtp-email.adapter';
export type { EmailSender as EmailService } from '@/modules/auth/domain/ports/email-sender.port';
import type { EmailSender } from '@/modules/auth/domain/ports/email-sender.port';

export class MockEmailService implements EmailSender {
  async sendVerificationEmail(email: string, username: string, token: string): Promise<void> {
    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
    console.log(`
┌────────────────────────────────────────────────────────┐
│               [MOCK EMAIL SERVICE]                     │
├────────────────────────────────────────────────────────┤
│ To: ${email.padEnd(50 - email.length)} │
│ Subject: Verify your Giftistry Account                 │
├────────────────────────────────────────────────────────┤
│ Hello ${username},                                     │
│ Please click the link below to verify your email:      │
│                                                        │
│ ${verificationUrl} │
└────────────────────────────────────────────────────────┘
    `);
  }

}
