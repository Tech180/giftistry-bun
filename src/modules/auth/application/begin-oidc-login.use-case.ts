import { AppError } from '@/common/middlewares/error.middleware';
import type { OidcClientPort } from '../domain/ports/oidc-client.port';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';

export class BeginOidcLoginUseCase {
  constructor(
    private oidcClient: OidcClientPort,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(): Promise<{ AuthorizationUrl: string }> {
    const config = this.serverConfigRepo.load();
    if (!config.OAuthEnabled) {
      throw new AppError('OAuth login is not enabled on this server', 403, 'FORBIDDEN');
    }

    const request = await this.oidcClient.buildAuthorizationRequest(
      config.OAuthScopes || 'openid email profile'
    );

    return { AuthorizationUrl: request.authorizationUrl };
  }
}
