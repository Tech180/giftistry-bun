import { Elysia } from 'elysia';
import type { FriendsRoutesDeps } from './interfaces/friends-routes-deps.interface';
import { friendRequestsRoutes } from './routes/friend-requests.routes';
import { friendsListRoutes } from './routes/friends-list.routes';
import { userSearchRoutes } from './routes/user-search.routes';

export const friendsRoutes = (deps: FriendsRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(friendsListRoutes(deps))
    .use(friendRequestsRoutes(deps))
    .use(userSearchRoutes(deps));
