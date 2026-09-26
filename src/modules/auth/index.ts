/** Public barrel for the auth module. Prefer this over deep imports. */
export type { User } from './domain/interfaces/user.interface';
export type { SafeUser } from './domain/types/safe-user.type';
export type { UserRepository } from './domain/ports/user.repository';
export type { EmailSender } from './domain/ports/email-sender.port';
export type { PasskeyRepository } from './domain/ports/passkey.repository';
export { createAuthModule, authMiddleware, ownerAuthMiddleware } from './auth.module';
export type { AuthModuleDeps } from './interfaces/auth-module-deps.interface';
export { createAuthMiddleware } from './presentation/middlewares/auth.middleware';
export { createOwnerAuthMiddleware } from './presentation/middlewares/owner-auth.middleware';
