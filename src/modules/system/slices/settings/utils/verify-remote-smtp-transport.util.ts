import nodemailer from 'nodemailer';
import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';

export async function verifyRemoteSmtpTransport(options: {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}): Promise<void> {
  if (!options.host || options.port === undefined) {
    throw new AppError(
      'SMTP host and port are required for remote SMTP type',
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }

  const transportOptions: {
    host: string;
    port: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
  } = {
    host: options.host,
    port: options.port,
    secure: options.secure,
  };
  if (options.user || options.pass) {
    transportOptions.auth = {
      user: options.user || '',
      pass: options.pass || '',
    };
  }

  try {
    const testTransporter = nodemailer.createTransport(transportOptions);
    await testTransporter.verify();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(
      `Failed to verify SMTP connection: ${message}`,
      DOMAIN_ERROR_STATUS.BAD_REQUEST,
      'BAD_REQUEST'
    );
  }
}
