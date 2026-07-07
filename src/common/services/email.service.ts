import nodemailer from 'nodemailer';
import { env } from '../consts/env.consts';
import { loadConfig } from '../database/connection';

export interface EmailService {
  sendVerificationEmail(email: string, username: string, token: string): Promise<void>;
}

export class SmtpEmailService implements EmailService {
  private getTransporter() {
    const config = loadConfig();
    let host = env.SMTP_HOST;
    let port = env.SMTP_PORT;
    let secure = env.SMTP_SECURE;
    let user = env.SMTP_USER;
    let pass = env.SMTP_PASS;
    let from = env.SMTP_FROM;

    if (config.smtpType === 'remote') {
      host = config.smtpHost || host;
      port = config.smtpPort !== undefined ? config.smtpPort : port;
      secure = config.smtpSecure !== undefined ? config.smtpSecure : secure;
      user = config.smtpUser !== undefined ? config.smtpUser : user;
      pass = config.smtpPass !== undefined ? config.smtpPass : pass;
      from = config.smtpFrom || from;
    }

    const transportOptions: any = {
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
    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
    
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

export class MockEmailService implements EmailService {
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
