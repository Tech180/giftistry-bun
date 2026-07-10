import { Elysia } from 'elysia';
import type { UserRepository } from './domain/ports/user.repository';
import type { PasskeyRepository } from './domain/ports/passkey.repository';
import type { EmailSender } from './domain/ports/email-sender.port';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import { SignupUseCase } from './application/signup.use-case';
import { LoginUseCase } from './application/login.use-case';
import { UpdateProfileUseCase } from './application/update-profile.use-case';
import { UserPreviewUseCase } from './application/user-preview.use-case';
import { VerifyEmailUseCase } from './application/verify-email.use-case';
import { ResendVerificationUseCase } from './application/resend-verification.use-case';
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
import { authRoutes, createAuthMiddleware } from './presentation/auth.routes';

export interface AuthModuleDeps {
  userRepo: UserRepository;
  passkeyRepo: PasskeyRepository;
  emailSender: EmailSender;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
  assertUserCanUseCase: AssertUserCanUseCase;
  wishlistRepo: WishlistRepository;
}

export let authMiddleware: ReturnType<typeof createAuthMiddleware>;

export function createAuthModule(deps: AuthModuleDeps) {
  authMiddleware = createAuthMiddleware(deps.userRepo);

  const authUseCases = {
    signup: new SignupUseCase(deps.userRepo, deps.getSitePolicyUseCase, deps.emailSender),
    login: new LoginUseCase(deps.userRepo, deps.getSitePolicyUseCase),
    updateProfile: new UpdateProfileUseCase(deps.userRepo),
    userPreview: new UserPreviewUseCase(deps.userRepo, deps.wishlistRepo),
    verifyEmail: new VerifyEmailUseCase(deps.userRepo),
    resendVerification: new ResendVerificationUseCase(deps.userRepo, deps.emailSender),
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
  };

  return new Elysia().use(authRoutes(authUseCases, deps.userRepo));
}

export { createAuthMiddleware } from './presentation/auth.routes';
