import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { FRIENDS_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { FriendsRoutesDeps } from '../interfaces/friends-routes-deps.interface';
import { friendRequestIdParamsSchema } from '../schemas/friend-request-id-params.schema';
import { sendFriendRequestBodySchema } from '../schemas/send-friend-request-body.schema';

export const friendRequestsRoutes = ({ useCases }: FriendsRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .get('/friends/requests', async ({ getAuthUser }) => {
      const user = await getAuthUser();
      const requests = await useCases.listFriendRequests.execute(user.userId);
      return { success: true, data: requests };
    }, {
      detail: {
        ...FRIENDS_SWAGGER_DETAIL,
        summary: 'List friend requests',
      },
    })
    .post('/friends/requests', async ({ getAuthUser, body: { Giftistry: { Friends: { ReceiverId } } } }) => {
      const user = await getAuthUser();
      const request = await useCases.sendFriendRequest.execute(user.userId, ReceiverId);
      return { success: true, data: request };
    }, {
      body: sendFriendRequestBodySchema,
      detail: {
        ...FRIENDS_SWAGGER_DETAIL,
        summary: 'Send friend request',
      },
    })
    .post('/friends/requests/:requestId/accept', async ({ getAuthUser, params: { requestId } }) => {
      const user = await getAuthUser();
      const friendship = await useCases.acceptFriendRequest.execute(user.userId, requestId);
      return { success: true, data: friendship };
    }, {
      params: friendRequestIdParamsSchema,
      detail: {
        ...FRIENDS_SWAGGER_DETAIL,
        summary: 'Accept friend request',
      },
    })
    .post('/friends/requests/:requestId/decline', async ({ getAuthUser, params: { requestId } }) => {
      const user = await getAuthUser();
      const request = await useCases.declineFriendRequest.execute(user.userId, requestId);
      return { success: true, data: request };
    }, {
      params: friendRequestIdParamsSchema,
      detail: {
        ...FRIENDS_SWAGGER_DETAIL,
        summary: 'Decline friend request',
      },
    })
    .post('/friends/requests/:requestId/cancel', async ({ getAuthUser, params: { requestId } }) => {
      const user = await getAuthUser();
      const request = await useCases.cancelFriendRequest.execute(user.userId, requestId);
      return { success: true, data: request };
    }, {
      params: friendRequestIdParamsSchema,
      detail: {
        ...FRIENDS_SWAGGER_DETAIL,
        summary: 'Cancel friend request',
      },
    });
