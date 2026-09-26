import { AppError } from '@/common/domain/errors/app-error';
import { getEnv } from '@/common/config/utils/get-env.util';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import { validatePasswordPolicy } from '@/common/domain/utils/validate-password-policy.util';
import { validateUsernamePolicy } from '@/common/domain/utils/validate-username-policy.util';
import { DEFAULT_SITE_POLICY } from '@/common/domain/constants/default-site-policy.constant';
import type { SaveSitePolicyUseCase } from '@/common/application/use-cases/save-site-policy.use-case';
import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';
import type { SetupPayload } from '../../../domain/interfaces/setup-payload.interface';
import { verifyRemoteDatabaseUrl } from '../utils/verify-remote-database-url.util';
import { verifyRemoteSmtpTransport } from '../utils/verify-remote-smtp-transport.util';

/** Postgres advisory lock key for first-boot admin create. */
const SETUP_ADVISORY_LOCK = 87236401;

export class RunInitialSetupUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private saveSitePolicy?: SaveSitePolicyUseCase
  ) {}

  async execute(payload: SetupPayload): Promise<void> {
    if (!getEnv().GIFTISTRY_ALLOW_SETUP) {
      throw new AppError(
        'Setup is disabled on this server',
        DOMAIN_ERROR_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const existingConfig = this.serverConfigRepo.load();
    if (existingConfig.AllowSetup === false) {
      throw new AppError(
        'Setup has been sealed on this server',
        DOMAIN_ERROR_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const initialized = await this.serverConfigRepo.isSystemInitialized();
    if (initialized) {
      throw new AppError(
        'Forbidden: System already setup',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    if (payload.DbType === 'remote') {
      await verifyRemoteDatabaseUrl(payload.DbUrl ?? '');
    }

    const smtpType = (payload.SmtpType === 'remote' ? 'remote' : 'local') as 'local' | 'remote';

    if (smtpType === 'remote') {
      await verifyRemoteSmtpTransport({
        host: payload.SmtpHost,
        port: payload.SmtpPort,
        secure: payload.SmtpSecure,
        user: payload.SmtpUser,
        pass: payload.SmtpPass,
      });
    }

    const { Username, Email, Password, FirstName, LastName } = payload.Admin;
    if (!Username || !Password) {
      throw new AppError(
        'Admin credentials (username and password) are required',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }
    const validatedUsername = validateUsernamePolicy(Username);
    validatePasswordPolicy(Password);

    this.serverConfigRepo.save({
      ...existingConfig,
      DbType: payload.DbType as 'local' | 'remote',
      DbUrl: payload.DbUrl,
      SmtpType: smtpType,
      SmtpHost: smtpType === 'remote' ? payload.SmtpHost : undefined,
      SmtpPort: smtpType === 'remote' ? payload.SmtpPort : undefined,
      SmtpUser: smtpType === 'remote' ? payload.SmtpUser : undefined,
      SmtpPass: smtpType === 'remote' ? payload.SmtpPass : undefined,
      SmtpSecure: smtpType === 'remote' ? payload.SmtpSecure : undefined,
      SmtpFrom: smtpType === 'remote' ? payload.SmtpFrom : undefined,
      AllowSetup: true,
    });

    await this.serverConfigRepo.initializeSchema();

    const email = Email?.trim() ? Email.trim() : null;
    const authHash = await Bun.password.hash(Password);

    try {
      await this.serverConfigRepo.createAdminUserWithLock({
        username: validatedUsername,
        email,
        firstName: FirstName || 'System',
        lastName: LastName || 'Admin',
        authHash,
        lockKey: SETUP_ADVISORY_LOCK,
      });
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = String(err instanceof Error ? err.message : err);
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (message.includes('unique') || message.includes('duplicate') || code === '23505') {
        throw new AppError(
          'Forbidden: System already setup',
          DOMAIN_ERROR_STATUS.BAD_REQUEST,
          'BAD_REQUEST'
        );
      }
      throw err;
    }

    if (this.saveSitePolicy) {
      await this.saveSitePolicy.execute({
        ...DEFAULT_SITE_POLICY,
        RegistrationMode: 'invite_only',
      });
    }

    const sealed = this.serverConfigRepo.load();
    this.serverConfigRepo.save({
      ...sealed,
      AllowSetup: false,
    });
  }
}
