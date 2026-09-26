import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import { mapToJobPublicView } from '../application/utils/map-to-job-public-view.util';
import {
  resolveItemEnrichMinRole,
  resolveItemSummarizeMinRole,
} from '../utils/resolve-item-job-min-role.util';
import { JOBS_SWAGGER_DETAIL } from './constants/swagger-detail.constant';
import type { JobsRouteDeps } from './interfaces/jobs-route-deps.interface';
import { itemEnrichBodySchema } from './schemas/item-enrich-body.schema';
import { itemSummarizeBodySchema } from './schemas/item-summarize-body.schema';
import { wishlistImportBodySchema } from './schemas/wishlist-import-body.schema';
import { mapItemEnrichBodyToPayload } from './utils/map-item-enrich-body.util';
import { toJobPublicViews } from './utils/to-job-public-views.util';

export const jobsRoutes = (deps: JobsRouteDeps) =>
  new Elysia({ prefix: '/api' })
    .use(deps.middleware.auth)
    .use(deps.middleware.listAccess)
    .post(
      '/jobs/wishlist-import',
      async ({ getAuthUser, body: { Giftistry: { Jobs: payload } }, request }) => {
        const user = await getAuthUser();
        if (payload.Mode === 'existing-list') {
          if (!payload.ListId) {
            throw new AppError('List ID is required', 400, 'BAD_REQUEST');
          }
          await getListAccessContext(user.userId, { listId: payload.ListId }, 'collaborator');
        }
        const ip =
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '127.0.0.1';
        const job = await deps.startWishlistImport.execute(
          user.userId,
          {
            mode: payload.Mode,
            listId: payload.ListId ?? null,
            title: payload.Title ?? null,
            fileName: payload.FileName,
            format: payload.Format ?? null,
            content: payload.Content,
            contentEncoding: payload.ContentEncoding,
            grabInfo: !!payload.GrabInfo,
            allowAi: payload.AllowAi !== false,
            optimizeCategories: payload.OptimizeCategories === true,
          },
          `${user.userId}:${ip}:wishlist-import`
        );
        return { success: true, data: job };
      },
      {
        detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Start wishlist import job' },
        body: wishlistImportBodySchema,
      }
    )
    .post(
      '/jobs/item-enrich',
      async ({ getAuthUser, body: { Giftistry: { Jobs: payload } }, request }) => {
        const user = await getAuthUser();
        const enrichMinRole = resolveItemEnrichMinRole(payload.Intent);
        const access = await getListAccessContext(
          user.userId,
          { listId: payload.ListId },
          enrichMinRole
        );

        const ip =
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '127.0.0.1';

        const result = await deps.startItemEnrich.execute(
          user.userId,
          mapItemEnrichBodyToPayload(payload),
          `${user.userId}:${ip}:item-enrich`,
          access.role
        );
        return { success: true, data: result };
      },
      {
        detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Start item enrich job' },
        body: itemEnrichBodySchema,
      }
    )
    .post(
      '/jobs/item-summarize',
      async ({ getAuthUser, body: { Giftistry: { Jobs: payload } }, request }) => {
        const user = await getAuthUser();
        const summarizeMinRole = resolveItemSummarizeMinRole(payload.WriteBack);
        await getListAccessContext(user.userId, { listId: payload.ListId }, summarizeMinRole);

        const ip =
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '127.0.0.1';

        const job = await deps.startItemSummarize.execute(
          user.userId,
          {
            listId: payload.ListId,
            itemId: payload.ItemId ?? null,
            writeBack: !!payload.WriteBack,
            name: payload.Name,
            text: payload.Text ?? null,
            linkUrl: payload.LinkUrl ?? null,
            websiteName: payload.WebsiteName ?? null,
            price: payload.Price !== undefined && payload.Price !== null ? Number(payload.Price) : null,
            category: payload.Category ?? null,
            priority:
              payload.Priority !== undefined && payload.Priority !== null
                ? Number(payload.Priority)
                : null,
            customFields: payload.CustomFields
              ? {
                  Predefined: payload.CustomFields.Predefined,
                  UserDefined: payload.CustomFields.UserDefined,
                }
              : undefined,
            variations: payload.Variations?.map((v) => ({
              Name: v.Name,
              Quantity: Number(v.Quantity),
            })),
            desiredQuantity:
              payload.DesiredQuantity !== undefined && payload.DesiredQuantity !== null
                ? Number(payload.DesiredQuantity)
                : null,
          },
          `${user.userId}:${ip}:item-summarize`
        );
        return { success: true, data: { Job: job } };
      },
      {
        detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Start item summarize job' },
        body: itemSummarizeBodySchema,
      }
    )
    .get(
      '/jobs/mine',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        const jobs = await deps.jobRepo.listActiveByUserId(user.userId);
        return {
          success: true,
          data: await toJobPublicViews(deps.jobRepo, jobs, deps.serverConfigRepo),
        };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'List my jobs' } }
    )
    .get(
      '/admin/jobs',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        if (!user.IsAdmin && !user.IsOwner) {
          throw new AppError('Admin access required', 403, 'FORBIDDEN');
        }
        const jobs = await deps.jobRepo.listActiveAll();
        return {
          success: true,
          data: await toJobPublicViews(deps.jobRepo, jobs, deps.serverConfigRepo),
        };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'List all jobs (admin)' } }
    )
    .get(
      '/jobs/:jobId',
      async ({ getAuthUser, params: { jobId } }) => {
        const user = await getAuthUser();
        const job = await deps.jobRepo.findById(jobId);
        if (!job || job.UserId !== user.userId) {
          throw new AppError('Job not found', 404, 'NOT_FOUND');
        }
        const items = await deps.jobRepo.listItems(jobId);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Get job' } }
    )
    .get(
      '/wishlists/:listId/jobs/active',
      async ({ getAuthUser, checkListAccess, params: { listId } }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const job = await deps.jobRepo.findActiveByListId(listId);
        if (!job || job.UserId !== user.userId) {
          return { success: true, data: null };
        }
        const items = await deps.jobRepo.listItems(job.Id);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Get active wishlist job' } }
    )
    .post(
      '/jobs/:jobId/cancel',
      async ({ getAuthUser, params: { jobId } }) => {
        const user = await getAuthUser();
        const job = await deps.jobRepo.requestCancel(jobId, user.userId);
        if (!job) {
          throw new AppError('Job not found', 404, 'NOT_FOUND');
        }
        const items = await deps.jobRepo.listItems(jobId);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Cancel job' } }
    )
    .post(
      '/jobs/:jobId/suspend',
      async ({ getAuthUser, params: { jobId } }) => {
        const user = await getAuthUser();
        const job = await deps.jobRepo.requestSuspend(jobId, user.userId);
        if (!job) {
          throw new AppError('Job not found or cannot be suspended', 404, 'NOT_FOUND');
        }
        const items = await deps.jobRepo.listItems(jobId);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Suspend job' } }
    )
    .post(
      '/jobs/:jobId/resume',
      async ({ getAuthUser, params: { jobId } }) => {
        const user = await getAuthUser();
        const job = await deps.jobRepo.requestResume(jobId, user.userId);
        if (!job) {
          throw new AppError('Job not found or cannot be resumed', 404, 'NOT_FOUND');
        }
        const items = await deps.jobRepo.listItems(jobId);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Resume job' } }
    )
    .post(
      '/admin/jobs/:jobId/cancel',
      async ({ getAuthUser, params: { jobId } }) => {
        const user = await getAuthUser();
        if (!user.IsAdmin && !user.IsOwner) {
          throw new AppError('Admin access required', 403, 'FORBIDDEN');
        }
        const job = await deps.jobRepo.requestCancelAny(jobId);
        if (!job) {
          throw new AppError('Job not found', 404, 'NOT_FOUND');
        }
        const items = await deps.jobRepo.listItems(jobId);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Cancel job (admin)' } }
    )
    .post(
      '/admin/jobs/:jobId/suspend',
      async ({ getAuthUser, params: { jobId } }) => {
        const user = await getAuthUser();
        if (!user.IsAdmin && !user.IsOwner) {
          throw new AppError('Admin access required', 403, 'FORBIDDEN');
        }
        const job = await deps.jobRepo.requestSuspendAny(jobId);
        if (!job) {
          throw new AppError('Job not found or cannot be suspended', 404, 'NOT_FOUND');
        }
        const items = await deps.jobRepo.listItems(jobId);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Suspend job (admin)' } }
    )
    .post(
      '/admin/jobs/:jobId/resume',
      async ({ getAuthUser, params: { jobId } }) => {
        const user = await getAuthUser();
        if (!user.IsAdmin && !user.IsOwner) {
          throw new AppError('Admin access required', 403, 'FORBIDDEN');
        }
        const job = await deps.jobRepo.requestResumeAny(jobId);
        if (!job) {
          throw new AppError('Job not found or cannot be resumed', 404, 'NOT_FOUND');
        }
        const items = await deps.jobRepo.listItems(jobId);
        return { success: true, data: mapToJobPublicView(job, items, deps.serverConfigRepo) };
      },
      { detail: { ...JOBS_SWAGGER_DETAIL, summary: 'Resume job (admin)' } }
    );
