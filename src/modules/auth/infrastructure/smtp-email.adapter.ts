import nodemailer from 'nodemailer';
import { env } from '@/common/consts/env.consts';
import { loadConfig } from '@/common/database/connection';
import { getPublicAppUrl } from '@/common/utils/public-app-url.util';
import type { EmailSender } from '../domain/ports/email-sender.port';

export class SmtpEmailAdapter implements EmailSender {
  private getTransporter() {
    const config = loadConfig();
    let host = env.SMTP_HOST;
    let port = env.SMTP_PORT;
    let secure = env.SMTP_SECURE;
    let user = env.SMTP_USER;
    let pass = env.SMTP_PASS;
    let from = env.SMTP_FROM;

    if (config.SmtpType === 'remote') {
      host = config.SmtpHost || host;
      port = config.SmtpPort !== undefined ? config.SmtpPort : port;
      secure = config.SmtpSecure !== undefined ? config.SmtpSecure : secure;
      user = config.SmtpUser !== undefined ? config.SmtpUser : user;
      pass = config.SmtpPass !== undefined ? config.SmtpPass : pass;
      from = config.SmtpFrom || from;
    }

    const transportOptions: Record<string, unknown> = {
      host,
      port,
      secure,
    };
    if (user || pass) {
      transportOptions.auth = { user, pass };
    }

    return {
      transporter: nodemailer.createTransport(transportOptions),
      from,
    };
  }

  async sendVerificationEmail(email: string, username: string, token: string): Promise<void> {
    const { transporter, from } = this.getTransporter();
    const verificationUrl = `${getPublicAppUrl()}/verify-email?token=${token}`;

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Verify your Giftistry Account',
        text: `Hello ${username},

Please click the link below to verify your email:

${verificationUrl}`,
        html: `<p>Hello ${username},</p><p>Please click the link below to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
      });
      console.log(`[SMTP] Verification email sent successfully to ${email}`);
    } catch (err) {
      console.warn(`[SMTP-WARN] Failed to send email via SMTP, falling back to mock:`, err);
      console.log(`
┌────────────────────────────────────────────────────────┐
│               [FALLBACK MOCK EMAIL SERVICE]            │
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
}
