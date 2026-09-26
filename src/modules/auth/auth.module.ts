import { Elysia } from 'elysia';
import { SignupUseCase } from './slices/session/use-cases/signup.use-case';
import { LoginUseCase } from './slices/session/use-cases/login.use-case';
import { ChangePasswordUseCase } from './slices/session/use-cases/change-password.use-case';
import { UpdateProfileUseCase } from './slices/profile/use-cases/update-profile.use-case';
import { UserPreviewUseCase } from './slices/profile/use-cases/user-preview.use-case';
import { ListCustomThemesUseCase } from './slices/themes/use-cases/list-custom-themes.use-case';
import { SaveCustomThemeUseCase } from './slices/themes/use-cases/save-custom-theme.use-case';
import { DeleteCustomThemeUseCase } from './slices/themes/use-cases/delete-custom-theme.use-case';
import { PasskeyLoginUseCase } from './slices/passkeys/use-cases/passkey-login.use-case';
import { RegisterPasskeyUseCase } from './slices/passkeys/use-cases/register-passkey.use-case';
import { ListPasskeysUseCase } from './slices/passkeys/use-cases/list-passkeys.use-case';
import { DeletePasskeyUseCase } from './slices/passkeys/use-cases/delete-passkey.use-case';
import { TwoFactorLoginUseCase } from './slices/session/use-cases/two-factor-login.use-case';
import { Enable2faUseCase } from './slices/two-factor/use-cases/enable-2fa.use-case';
import { Disable2faUseCase } from './slices/two-factor/use-cases/disable-2fa.use-case';
import { DisableAccountUseCase } from './slices/session/use-cases/disable-account.use-case';
import { DeleteAccountUseCase } from './slices/session/use-cases/delete-account.use-case';
import { GetCurrentUserUseCase } from './slices/session/use-cases/get-current-user.use-case';
import { GetOnboardingStateUseCase } from './slices/profile/use-cases/get-onboarding-state.use-case';
import { CompleteUserOnboardingUseCase } from './slices/profile/use-cases/complete-user-onboarding.use-case';
import { CompleteOwnerOnboardingUseCase } from './slices/profile/use-cases/complete-owner-onboarding.use-case';
import { PatchTutorialUseCase } from './slices/profile/use-cases/patch-tutorial.use-case';
import { BeginOidcLoginUseCase } from './slices/oidc/use-cases/begin-oidc-login.use-case';
import { HandleOidcCallbackUseCase } from './slices/oidc/use-cases/handle-oidc-callback.use-case';
import { authRoutes } from './presentation/auth.routes';
import { createAuthMiddleware } from './presentation/middlewares/auth.middleware';
import { createOwnerAuthMiddleware } from './presentation/middlewares/owner-auth.middleware';
import { themeCatalogRoutes } from './presentation/routes/theme-catalog.routes';
import { GetThemeCssUseCase } from './slices/themes/use-cases/get-theme-css.use-case';
import type { AuthModuleDeps } from './interfaces/auth-module-deps.interface';

export type { AuthModuleDeps };

export let authMiddleware: ReturnType<typeof createAuthMiddleware>;
export let ownerAuthMiddleware: ReturnType<typeof createOwnerAuthMiddleware>;

export function createAuthModule(deps: AuthModuleDeps) {
  authMiddleware = createAuthMiddleware(deps.userRepo);
  ownerAuthMiddleware = createOwnerAuthMiddleware(deps.userRepo);
  const oidcClient = deps.oidcClient;
  const authUseCases = {
    signup: new SignupUseCase(
      deps.userRepo,
      deps.getSitePolicyUseCase,
      deps.registrationInviteRepo
    ),
    login: new LoginUseCase(deps.userRepo, deps.getSitePolicyUseCase),
    changePassword: new ChangePasswordUseCase(deps.userRepo, deps.getSitePolicyUseCase),
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
    patchTutorial: new PatchTutorialUseCase(deps.userRepo),
    beginOidcLogin: new BeginOidcLoginUseCase(oidcClient, deps.serverConfigRepo),
    handleOidcCallback: new HandleOidcCallbackUseCase(
      oidcClient,
      deps.userRepo,
      deps.serverConfigRepo,
      deps.getSitePolicyUseCase,
      deps.registrationInviteRepo
    ),
  };

  return new Elysia()
    .use(themeCatalogRoutes({ getThemeCss: new GetThemeCssUseCase(deps.userRepo) }))
    .use(authRoutes({ useCases: authUseCases, userRepo: deps.userRepo, serverConfigRepo: deps.serverConfigRepo }));
}
