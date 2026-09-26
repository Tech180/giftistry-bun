import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { USERS_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { FriendsRoutesDeps } from '../interfaces/friends-routes-deps.interface';
import { searchUsersQuerySchema } from '../schemas/search-users-query.schema';

export const userSearchRoutes = ({ useCases }: FriendsRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .get('/users/search', async ({ getAuthUser, query }) => {
      const user = await getAuthUser();
      const results = await useCases.searchUsers.execute(user.userId, query.q);
      return { success: true, data: results };
    }, {
      query: searchUsersQuerySchema,
      detail: {
        ...USERS_SWAGGER_DETAIL,
        summary: 'Search users',
      },
    });
