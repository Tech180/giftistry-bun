import nodemailer from 'nodemailer';
import { getEnv } from '@/common/config/utils/get-env.util';
import { loadConfig } from '@/common/config/utils/server-config-file.util';
import { getPublicAppUrl } from '@/common/utils/public-app-url.util';
import type { EmailSender } from '../../domain/ports/email-sender.port';

export class SmtpEmailAdapter implements EmailSender {
  private getTransporter() {
    const config = loadConfig();
    const runtime = getEnv();
    let host = runtime.SMTP_HOST;
    let port = runtime.SMTP_PORT;
    let secure = runtime.SMTP_SECURE;
    let user = runtime.SMTP_USER;
    let pass = runtime.SMTP_PASS;
    let from = runtime.SMTP_FROM;

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
