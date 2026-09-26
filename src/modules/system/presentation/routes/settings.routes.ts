import { Elysia } from 'elysia';
import type { SystemSettingsPayload } from '../../domain/interfaces/system-settings-payload.interface';
import { ownerAuthMiddleware } from '@/modules/auth';
import { SYSTEM_OWNER_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { UseCases } from '../interfaces/use-cases.interface';
import { saveSettingsBodySchema } from '../schemas/save-settings-body.schema';

export const settingsRoutes = (useCases: UseCases) =>
  new Elysia()
    .use(ownerAuthMiddleware)
    .get(
      '/settings',
      async ({ getOwnerUser }) => {
        await getOwnerUser();
        const data = useCases.getSystemSettings.execute();
        return { success: true, data };
      },
      { detail: { ...SYSTEM_OWNER_SWAGGER_DETAIL, summary: 'Get system settings' } }
    )
    .post(
      '/settings',
      async ({ getOwnerUser, body: { Giftistry: { System: settings } } }) => {
        await getOwnerUser();
        await useCases.saveSystemSettings.execute(settings as SystemSettingsPayload, {
          actorIsOwner: true,
        });
        return { success: true };
      },
      {
        body: saveSettingsBodySchema,
        detail: { ...SYSTEM_OWNER_SWAGGER_DETAIL, summary: 'Save system settings' },
      }
    )
    .get(
      '/metadata-packs',
      async ({ getOwnerUser }) => {
        await getOwnerUser();
        const data = useCases.getMetadataPacks.execute();
        return { success: true, data };
      },
      {
        detail: {
          ...SYSTEM_OWNER_SWAGGER_DETAIL,
          summary: 'List metadata enrichment packs',
        },
      }
    );
