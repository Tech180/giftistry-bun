import { Elysia } from 'elysia';
import type { UserRepository } from './domain/ports/user.repository';
import type { PasskeyRepository } from './domain/ports/passkey.repository';
import type { EmailSender } from './domain/ports/email-sender.port';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { SaveSitePolicyUseCase } from '@/common/application/save-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { SaveSystemSettingsUseCase } from '@/modules/system/application/save-system-settings.use-case';
import { SignupUseCase } from './application/signup.use-case';
import { LoginUseCase } from './application/login.use-case';
import { UpdateProfileUseCase } from './application/update-profile.use-case';
import { UserPreviewUseCase } from './application/user-preview.use-case';
import { ListCustomThemesUseCase } from './application/list-custom-themes.use-case';
import { SaveCustomThemeUseCase } from './application/save-custom-theme.use-case';
import { DeleteCustomThemeUseCase } from './application/delete-custom-theme.use-case';
import { PasskeyLoginUseCase } from './application/passkey-login.use-case';
import { RegisterPasskeyUseCase } from './application/register-passkey.use-case';
import { ListPasskeysUseCase } from './application/list-passkeys.use-case';
import { DeletePasskeyUseCase } from './application/delete-passkey.use-case';
import { TwoFactorLoginUseCase } from './application/two-factor-login.use-case';
import { Setup2faUseCase } from './application/setup-2fa.use-case';
import { Enable2faUseCase } from './application/enable-2fa.use-case';
import { Disable2faUseCase } from './application/disable-2fa.use-case';
import { DisableAccountUseCase } from './application/disable-account.use-case';
import { DeleteAccountUseCase } from './application/delete-account.use-case';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case';
import { GetOnboardingStateUseCase } from './application/get-onboarding-state.use-case';
import { CompleteUserOnboardingUseCase } from './application/complete-user-onboarding.use-case';
import { CompleteOwnerOnboardingUseCase } from './application/complete-owner-onboarding.use-case';
import { BeginOidcLoginUseCase } from './application/begin-oidc-login.use-case';
import { HandleOidcCallbackUseCase } from './application/handle-oidc-callback.use-case';
import { OpenIdClientAdapter } from './infrastructure/openid-client.adapter';
import { authRoutes, createAuthMiddleware } from './presentation/auth.routes';

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
}

export let authMiddleware: ReturnType<typeof createAuthMiddleware>;

export function createAuthModule(deps: AuthModuleDeps) {
  authMiddleware = createAuthMiddleware(deps.userRepo);
  const oidcClient = new OpenIdClientAdapter(deps.serverConfigRepo);

  const authUseCases = {
    signup: new SignupUseCase(deps.userRepo, deps.getSitePolicyUseCase),
    login: new LoginUseCase(deps.userRepo, deps.getSitePolicyUseCase),
    updateProfile: new UpdateProfileUseCase(deps.userRepo),
    userPreview: new UserPreviewUseCase(deps.userRepo, deps.wishlistRepo),
    listCustomThemes: new ListCustomThemesUseCase(deps.userRepo),
    saveCustomTheme: new SaveCustomThemeUseCase(deps.userRepo, deps.assertUserCanUseCase),
    deleteCustomTheme: new DeleteCustomThemeUseCase(deps.userRepo),
    passkeyLogin: new PasskeyLoginUseCase(deps.passkeyRepo, deps.userRepo),
    registerPasskey: new RegisterPasskeyUseCase(deps.passkeyRepo),
    listPasskeys: new ListPasskeysUseCase(deps.passkeyRepo),
    deletePasskey: new DeletePasskeyUseCase(deps.passkeyRepo),
    twoFactorLogin: new TwoFactorLoginUseCase(deps.userRepo),
    setup2fa: new Setup2faUseCase(),
    enable2fa: new Enable2faUseCase(deps.userRepo),
    disable2fa: new Disable2faUseCase(deps.userRepo),
    disableAccount: new DisableAccountUseCase(deps.userRepo, deps.writeAuditLogUseCase),
    deleteAccount: new DeleteAccountUseCase(deps.userRepo, deps.writeAuditLogUseCase),
    getCurrentUser: new GetCurrentUserUseCase(deps.userRepo),
    getOnboardingState: new GetOnboardingStateUseCase(deps.userRepo, deps.serverConfigRepo),
    completeUserOnboarding: new CompleteUserOnboardingUseCase(deps.userRepo),
    completeOwnerOnboarding: new CompleteOwnerOnboardingUseCase(
      deps.userRepo,
      deps.serverConfigRepo,
      deps.getSitePolicyUseCase,
      deps.saveSitePolicyUseCase,
      deps.saveSystemSettingsUseCase
    ),
    beginOidcLogin: new BeginOidcLoginUseCase(oidcClient, deps.serverConfigRepo),
    handleOidcCallback: new HandleOidcCallbackUseCase(
      oidcClient,
      deps.userRepo,
      deps.serverConfigRepo,
      deps.getSitePolicyUseCase
    ),
  };

  return new Elysia().use(authRoutes(authUseCases, deps.userRepo));
}

export { createAuthMiddleware } from './presentation/auth.routes';
