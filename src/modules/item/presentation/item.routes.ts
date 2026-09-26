import { Elysia } from 'elysia';
import type { ItemRoutesDeps } from './interfaces/item-routes-deps.interface';
import { catalogRoutes } from './routes/catalog.routes';
import { claimsRoutes } from './routes/claims.routes';
import { linksRoutes } from './routes/links.routes';
import { reviewsRoutes } from './routes/reviews.routes';
import { substitutionsRoutes } from './routes/substitutions.routes';

export const itemRoutes = (deps: ItemRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(catalogRoutes(deps))
    .use(claimsRoutes(deps))
    .use(linksRoutes(deps))
    .use(reviewsRoutes(deps))
    .use(substitutionsRoutes(deps));
