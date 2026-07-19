import type { UserRepository } from '../domain/ports/user.repository';
import type { OidcClientPort } from '../domain/ports/oidc-client.port';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import { UserEntity, toSafeUser, type SafeUser } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { mergeUserPolicy } from '@/common/types/user-policy';
import { consumeOAuthState } from '../infrastructure/oauth-state.store';

function sanitizeUsername(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50);
  return cleaned.length >= 3 ? cleaned : `user_${crypto.randomUUID().slice(0, 8)}`;
}

async function ensureUniqueUsername(userRepo: UserRepository, base: string): Promise<string> {
  let candidate = sanitizeUsername(base);
  let suffix = 0;
  while (await userRepo.findByUsername(candidate)) {
    suffix += 1;
    candidate = sanitizeUsername(`${base}${suffix}`);
  }
  return candidate;
}

export class HandleOidcCallbackUseCase {
  constructor(
    private oidcClient: OidcClientPort,
    private userRepo: UserRepository,
    private serverConfigRepo: ServerConfigRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(code: string, state: string): Promise<SafeUser> {
    const nonce = consumeOAuthState(state);
    if (!nonce) {
      throw new AppError('OAuth session expired or invalid state', 400, 'BAD_REQUEST');
    }

    const profile = await this.oidcClient.exchangeCode(code, state, state, nonce);
    const config = this.serverConfigRepo.load();
    const sitePolicy = await this.getSitePolicy.execute();

    let user = await this.userRepo.findByOauthSub(profile.sub);
    if (user) {
      const entity = UserEntity.from(user);
      entity.assertCanLogin(sitePolicy);
      await this.userRepo.resetLockoutAndRecordLogin(user.Id);
      return toSafeUser(user);
    }

    if (profile.email) {
      const byEmail = await this.userRepo.findByEmail(profile.email);
      if (byEmail) {
        if (byEmail.OauthSub && byEmail.OauthSub !== profile.sub) {
          throw new AppError('This email is linked to a different SSO account', 409, 'CONFLICT');
        }
        user = await this.userRepo.linkOauthSub(byEmail.Id, profile.sub);
        const entity = UserEntity.from(user);
        entity.assertCanLogin(sitePolicy);
        await this.userRepo.resetLockoutAndRecordLogin(user.Id);
        return toSafeUser(user);
      }
    }

    if (config.OAuthAutoRegister === false) {
      throw new AppError('No matching account found. Contact an administrator.', 403, 'FORBIDDEN');
    }

    if (sitePolicy.RegistrationMode === 'disabled') {
      throw new AppError('Registration is currently disabled', 403, 'FORBIDDEN');
    }

    if (sitePolicy.RegistrationMode === 'invite_only') {
      throw new AppError(
        'Registration is invite-only. Contact an administrator for access.',
        403,
        'FORBIDDEN'
      );
    }

    const baseUsername = profile.preferredUsername || profile.email?.split('@')[0] || profile.sub;
    const username = await ensureUniqueUsername(this.userRepo, baseUsername);
    const userCount = await this.userRepo.count();
    const isFirstUser = userCount === 0;

    user = await this.userRepo.createOauthUser({
      username,
      email: profile.email?.trim() || null,
      firstName: profile.givenName?.trim() || username,
      lastName: profile.familyName?.trim() || '',
      oauthSub: profile.sub,
      isAdmin: isFirstUser,
      isOwner: isFirstUser,
    });

    await this.userRepo.setDefaultUserPolicy(user.Id, JSON.stringify(mergeUserPolicy(sitePolicy.DefaultUserPolicy)));
    await this.userRepo.resetLockoutAndRecordLogin(user.Id);
    return toSafeUser(user);
  }
}
