import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { FRIENDS_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { FriendsRoutesDeps } from '../interfaces/friends-routes-deps.interface';
import { friendIdParamsSchema } from '../schemas/friend-id-params.schema';

export const friendsListRoutes = ({ useCases }: FriendsRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .get('/friends', async ({ getAuthUser }) => {
      const user = await getAuthUser();
      const friends = await useCases.listFriends.execute(user.userId);
      return { success: true, data: friends };
    }, {
      detail: {
        ...FRIENDS_SWAGGER_DETAIL,
        summary: 'List friends',
      },
    })
    .delete('/friends/:friendId', async ({ getAuthUser, params: { friendId } }) => {
      const user = await getAuthUser();
      await useCases.unfriend.execute(user.userId, friendId);
      return { success: true };
    }, {
      params: friendIdParamsSchema,
      detail: {
        ...FRIENDS_SWAGGER_DETAIL,
        summary: 'Unfriend a user',
      },
    });
