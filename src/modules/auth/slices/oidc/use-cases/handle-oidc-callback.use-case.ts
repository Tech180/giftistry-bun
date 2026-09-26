import type { UserRepository } from '../../../domain/ports/user.repository';
import type { OidcClientPort } from '../../../domain/ports/oidc-client.port';
import type { ServerConfigRepository } from '@/modules/system';
import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { RegistrationInviteRepository } from '@/modules/registration-invite';
import {
  consumeRegistrationInvite,
  loadValidRegistrationInvite,
} from '@/modules/registration-invite';
import { UserEntity } from '../../../domain/user.entity';
import type { SafeUser } from '../../../domain/types/safe-user.type';
import { toSafeUser } from '../../../domain/utils/to-safe-user.util';
import { AppError } from '@/common/domain/errors/app-error';
import { mergeUserPolicy } from '@/common/domain/utils/merge-user-policy.util';
import { ensureUniqueUsername } from '../utils/ensure-unique-username.util';

export class HandleOidcCallbackUseCase {
  constructor(
    private oidcClient: OidcClientPort,
    private userRepo: UserRepository,
    private serverConfigRepo: ServerConfigRepository,
    private getSitePolicy: GetSitePolicyUseCase,
    private registrationInviteRepo: RegistrationInviteRepository
  ) {}

  async execute(code: string, state: string): Promise<SafeUser> {
    const oauthState = this.oidcClient.consumeOAuthState(state);
    if (!oauthState) {
      throw new AppError('OAuth session expired or invalid state', 400, 'BAD_REQUEST');
    }

    const profile = await this.oidcClient.exchangeCode(code, state, state, oauthState.nonce);
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

    let inviteToConsume = null;
    if (sitePolicy.RegistrationMode === 'invite_only') {
      inviteToConsume = await loadValidRegistrationInvite(
        this.registrationInviteRepo,
        oauthState.inviteToken
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
    if (inviteToConsume) {
      await consumeRegistrationInvite(this.registrationInviteRepo, inviteToConsume);
    }
    await this.userRepo.resetLockoutAndRecordLogin(user.Id);
    return toSafeUser(user);
  }
}
