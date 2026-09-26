import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { SaveSitePolicyUseCase } from '@/common/application/use-cases/save-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ServerConfigRepository } from '@/modules/system';
import type { SaveSystemSettingsUseCase } from '@/modules/system';
import type { RegistrationInviteRepository } from '@/modules/registration-invite';
import type { UserRepository } from '../domain/ports/user.repository';
import type { PasskeyRepository } from '../domain/ports/passkey.repository';
import type { EmailSender } from '../domain/ports/email-sender.port';
import type { OidcClientPort } from '../domain/ports/oidc-client.port';

export interface AuthModuleDeps {
  userRepo: UserRepository;
  passkeyRepo: PasskeyRepository;
  emailSender: EmailSender;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  saveSitePolicyUseCase: SaveSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
  assertUserCanUseCase: AssertUserCanUseCase;
  wishlistRepo: WishlistRepository;
  serverConfigRepo: ServerConfigRepository;
  saveSystemSettingsUseCase: SaveSystemSettingsUseCase;
  registrationInviteRepo: RegistrationInviteRepository;
  oidcClient: OidcClientPort;
}
