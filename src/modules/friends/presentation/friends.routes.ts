import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import type { FriendsUseCases } from './friends-use-cases.interface';

export const friendsRoutes = (useCases: FriendsUseCases) => new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .get('/friends', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const friends = await useCases.listFriends.execute(user.userId);
    return { success: true, data: friends };
  }, {
    detail: {
      tags: ['Friends'],
      summary: 'List friends',
      security: [{ bearerAuth: [] }]
    }
  })
  .get('/friends/requests', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const requests = await useCases.listFriendRequests.execute(user.userId);
    return { success: true, data: requests };
  }, {
    detail: {
      tags: ['Friends'],
      summary: 'List friend requests',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/friends/requests', async ({ getAuthUser, body: { receiverId } }) => {
    const user = await getAuthUser();
    const request = await useCases.sendFriendRequest.execute(user.userId, receiverId);
    return { success: true, data: request };
  }, {
    body: t.Object({ receiverId: t.String() }),
    detail: {
      tags: ['Friends'],
      summary: 'Send friend request',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/friends/requests/:requestId/accept', async ({ getAuthUser, params: { requestId } }) => {
    const user = await getAuthUser();
    const friendship = await useCases.acceptFriendRequest.execute(user.userId, requestId);
    return { success: true, data: friendship };
  }, {
    params: t.Object({ requestId: t.String() }),
    detail: {
      tags: ['Friends'],
      summary: 'Accept friend request',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/friends/requests/:requestId/decline', async ({ getAuthUser, params: { requestId } }) => {
    const user = await getAuthUser();
    const request = await useCases.declineFriendRequest.execute(user.userId, requestId);
    return { success: true, data: request };
  }, {
    params: t.Object({ requestId: t.String() }),
    detail: {
      tags: ['Friends'],
      summary: 'Decline friend request',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/friends/requests/:requestId/cancel', async ({ getAuthUser, params: { requestId } }) => {
    const user = await getAuthUser();
    const request = await useCases.cancelFriendRequest.execute(user.userId, requestId);
    return { success: true, data: request };
  }, {
    params: t.Object({ requestId: t.String() }),
    detail: {
      tags: ['Friends'],
      summary: 'Cancel friend request',
      security: [{ bearerAuth: [] }]
    }
  })
  .delete('/friends/:friendId', async ({ getAuthUser, params: { friendId } }) => {
    const user = await getAuthUser();
    await useCases.unfriend.execute(user.userId, friendId);
    return { success: true };
  }, {
    params: t.Object({ friendId: t.String() }),
    detail: {
      tags: ['Friends'],
      summary: 'Unfriend a user',
      security: [{ bearerAuth: [] }]
    }
  })
  .get('/users/search', async ({ getAuthUser, query }) => {
    const user = await getAuthUser();
    const results = await useCases.searchUsers.execute(user.userId, query.q);
    return { success: true, data: results };
  }, {
    query: t.Object({ q: t.String() }),
    detail: {
      tags: ['Users'],
      summary: 'Search users',
      security: [{ bearerAuth: [] }]
    }
  });
