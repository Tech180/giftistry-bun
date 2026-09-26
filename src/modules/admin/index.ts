/** Public barrel for the admin module. Prefer this over deep imports. */
export { AdminUser } from './domain/admin-user.entity';
export type { UserDto } from './domain/interfaces/user-dto.interface';
export type { UserListItemDto } from './domain/interfaces/user-list-item-dto.interface';
export { createAdminAuthMiddleware } from './presentation/middlewares/admin-auth.middleware';
export type { AdminAuthMiddleware } from './presentation/interfaces/admin-auth-middleware.type';
export { createAdminModule } from './admin.module';
