import { Elysia } from 'elysia';
import { adminRoutes } from './presentation/admin.routes';

export const adminModule = new Elysia().use(adminRoutes);
