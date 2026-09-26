import { AppError } from '@/common/domain/errors/app-error';
import type { OidcClientPort } from '../../../domain/ports/oidc-client.port';
import type { ServerConfigRepository } from '@/modules/system';

export class BeginOidcLoginUseCase {
  constructor(
    private oidcClient: OidcClientPort,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(inviteToken?: string | null): Promise<{ AuthorizationUrl: string }> {
    const config = this.serverConfigRepo.load();
    if (!config.OAuthEnabled) {
      throw new AppError('OAuth login is not enabled on this server', 403, 'FORBIDDEN');
    }

    const request = await this.oidcClient.buildAuthorizationRequest(
      config.OAuthScopes || 'openid email profile',
      inviteToken
    );

    return { AuthorizationUrl: request.authorizationUrl };
  }
}
