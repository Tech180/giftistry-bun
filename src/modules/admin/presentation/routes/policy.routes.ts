import { Elysia } from 'elysia';
import type { AdminAuthMiddleware } from '../interfaces/admin-auth-middleware.type';
import type { UseCases } from '../interfaces/use-cases.interface';
import { ADMIN_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import { saveSitePolicyBodySchema } from '../schemas/save-site-policy-body.schema';
import { updateUserPolicyBodySchema } from '../schemas/update-user-policy-body.schema';
import { mapSitePolicyPayload } from '../utils/map-site-policy-payload.util';
import { mapUserPolicyPayload } from '../utils/map-user-policy-payload.util';

export const policyRoutes = (useCases: UseCases, adminAuth: AdminAuthMiddleware) =>
  new Elysia()
    .use(adminAuth)
    .get('/site-policy', async ({ getAdminUser }) => {
      await getAdminUser();
      const result = await useCases.getSitePolicy.execute();
      return { success: true, ...result };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Get site policy' } })
    .patch('/site-policy', async ({ getAdminUser, body: { Giftistry: { SitePolicy: policy } }, request }) => {
      const admin = await getAdminUser();
      const result = await useCases.saveSitePolicy.execute(
        admin.Id,
        mapSitePolicyPayload(policy),
        request.headers.get('x-forwarded-for')
      );
      return { success: true, ...result };
    }, {
      detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Update site policy' },
      body: saveSitePolicyBodySchema,
    })
    .patch('/users/:id/policy', async ({ getAdminUser, params: { id }, body: { Giftistry: { Policy: policyPayload } }, request }) => {
      const admin = await getAdminUser();
      await useCases.updateUserPolicy.execute(
        admin.Id,
        id,
        mapUserPolicyPayload(policyPayload),
        request.headers.get('x-forwarded-for')
      );
      return { success: true };
    }, {
      detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Update user policy' },
      body: updateUserPolicyBodySchema,
    });
