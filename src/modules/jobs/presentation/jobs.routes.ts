import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import { toJobPublicView } from '../domain/background-job.entity';
import type { BackgroundJob, ItemEnrichJobPayload } from '../domain/background-job.entity';
import type { StartWishlistImportJobUseCase } from '../application/start-wishlist-import-job.use-case';
import type { StartItemEnrichJobUseCase } from '../application/start-item-enrich-job.use-case';
import type { StartItemSummarizeJobUseCase } from '../application/start-item-summarize-job.use-case';
import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';

export interface JobsRouteDeps {
  startWishlistImport: StartWishlistImportJobUseCase;
  startItemEnrich: StartItemEnrichJobUseCase;
  startItemSummarize: StartItemSummarizeJobUseCase;
  jobRepo: BackgroundJobRepository;
  middleware: RouteMiddleware;
}

async function toViews(jobRepo: BackgroundJobRepository, jobs: BackgroundJob[]) {
  return Promise.all(
    jobs.map(async (job) => {
      const items = await jobRepo.listItems(job.Id);
      return toJobPublicView(job, items);
    })
  );
}

const jobsDetail = {
  tags: ['Jobs'] as string[],
  security: [{ bearerAuth: [] as string[] }],
};

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
          },
          `${user.userId}:${ip}:wishlist-import`
        );
        return { success: true, data: job };
      },
      {
        detail: { ...jobsDetail, summary: 'Start wishlist import job' },
        body: t.Object({
          Giftistry: t.Object({
            Jobs: t.Object({
              Mode: t.Union([t.Literal('create-list'), t.Literal('existing-list')]),
              ListId: t.Optional(t.Nullable(t.String())),
              Title: t.Optional(t.Nullable(t.String())),
              FileName: t.String(),
              Format: t.Optional(t.Nullable(t.String())),
              Content: t.String(),
              ContentEncoding: t.Union([
                t.Literal('text'),
                t.Literal('base64'),
                t.Literal('data-url'),
              ]),
              GrabInfo: t.Optional(t.Boolean()),
              AllowAi: t.Optional(t.Boolean()),
            }),
          }),
        }),
      }
    )
    .post(
      '/jobs/item-enrich',
      async ({ getAuthUser, body: { Giftistry: { Jobs: payload } }, request }) => {
        const user = await getAuthUser();
        await getListAccessContext(user.userId, { listId: payload.ListId }, 'collaborator');

        const ip =
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '127.0.0.1';

        let jobPayload: ItemEnrichJobPayload;
        if (payload.Intent === 'create-from-url') {
          jobPayload = { intent: 'create-from-url', listId: payload.ListId, url: payload.Url };
        } else if (payload.Intent === 'update-item') {
          if (!payload.ItemId) {
            throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
          }
          jobPayload = {
            intent: 'update-item',
            listId: payload.ListId,
            url: payload.Url,
            itemId: payload.ItemId,
            writeBack: true,
          };
        } else {
          jobPayload = {
            intent: 'draft-populate',
            listId: payload.ListId,
            url: payload.Url,
            writeBack: false,
          };
        }

        const result = await deps.startItemEnrich.execute(
          user.userId,
          jobPayload,
          `${user.userId}:${ip}:item-enrich`
        );
        return { success: true, data: result };
      },
      {
        detail: { ...jobsDetail, summary: 'Start item enrich job' },
        body: t.Object({
          Giftistry: t.Object({
            Jobs: t.Object({
              Intent: t.Union([
                t.Literal('create-from-url'),
                t.Literal('update-item'),
                t.Literal('draft-populate'),
              ]),
              ListId: t.String(),
              Url: t.String(),
              ItemId: t.Optional(t.Nullable(t.String())),
            }),
          }),
        }),
      }
    )
    .post(
      '/jobs/item-summarize',
      async ({ getAuthUser, body: { Giftistry: { Jobs: payload } }, request }) => {
        const user = await getAuthUser();
        await getListAccessContext(user.userId, { listId: payload.ListId }, 'collaborator');

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
            priority: payload.Priority !== undefined && payload.Priority !== null ? Number(payload.Priority) : null,
            customFields: payload.CustomFields
              ? {
                  Predefined: payload.CustomFields.Predefined,
                  UserDefined: payload.CustomFields.UserDefined,
                }
              : undefined,
            variations: payload.Variations?.map((v) => ({ Name: v.Name, Quantity: Number(v.Quantity) })),
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
        detail: { ...jobsDetail, summary: 'Start item summarize job' },
        body: t.Object({
          Giftistry: t.Object({
            Jobs: t.Object({
              ListId: t.String(),
              ItemId: t.Optional(t.Nullable(t.String())),
              WriteBack: t.Optional(t.Boolean()),
              Name: t.String(),
              Text: t.Optional(t.Nullable(t.String())),
              LinkUrl: t.Optional(t.Nullable(t.String())),
              WebsiteName: t.Optional(t.Nullable(t.String())),
              Price: t.Optional(t.Nullable(t.Numeric())),
              Category: t.Optional(t.Nullable(t.String())),
              Priority: t.Optional(t.Nullable(t.Numeric())),
              CustomFields: t.Optional(
                t.Object({
                  Predefined: t.Optional(t.Record(t.String(), t.Nullable(t.String()))),
                  UserDefined: t.Optional(t.Record(t.String(), t.String())),
                })
              ),
              Variations: t.Optional(
                t.Array(
                  t.Object({
                    Name: t.String(),
                    Quantity: t.Numeric(),
                  })
                )
              ),
              DesiredQuantity: t.Optional(t.Nullable(t.Numeric())),
            }),
          }),
        }),
      }
    )
    .get('/jobs/mine', async ({ getAuthUser }) => {
      const user = await getAuthUser();
      const jobs = await deps.jobRepo.listActiveByUserId(user.userId);
      return { success: true, data: await toViews(deps.jobRepo, jobs) };
    }, { detail: { ...jobsDetail, summary: 'List my jobs' } })
    .get('/admin/jobs', async ({ getAuthUser }) => {
      const user = await getAuthUser();
      if (!user.IsAdmin && !user.IsOwner) {
        throw new AppError('Admin access required', 403, 'FORBIDDEN');
      }
      const jobs = await deps.jobRepo.listActiveAll();
      return { success: true, data: await toViews(deps.jobRepo, jobs) };
    }, { detail: { ...jobsDetail, summary: 'List all jobs (admin)' } })
    .get('/jobs/:jobId', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.findById(jobId);
      if (!job || job.UserId !== user.userId) {
        throw new AppError('Job not found', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    }, { detail: { ...jobsDetail, summary: 'Get job' } })
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
        return { success: true, data: toJobPublicView(job, items) };
      },
      { detail: { ...jobsDetail, summary: 'Get active wishlist job' } }
    )
    .post('/jobs/:jobId/cancel', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.requestCancel(jobId, user.userId);
      if (!job) {
        throw new AppError('Job not found', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    }, { detail: { ...jobsDetail, summary: 'Cancel job' } })
    .post('/jobs/:jobId/suspend', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.requestSuspend(jobId, user.userId);
      if (!job) {
        throw new AppError('Job not found or cannot be suspended', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    }, { detail: { ...jobsDetail, summary: 'Suspend job' } })
    .post('/jobs/:jobId/resume', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.requestResume(jobId, user.userId);
      if (!job) {
        throw new AppError('Job not found or cannot be resumed', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    }, { detail: { ...jobsDetail, summary: 'Resume job' } })
    .post('/admin/jobs/:jobId/cancel', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      if (!user.IsAdmin && !user.IsOwner) {
        throw new AppError('Admin access required', 403, 'FORBIDDEN');
      }
      const job = await deps.jobRepo.requestCancelAny(jobId);
      if (!job) {
        throw new AppError('Job not found', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    }, { detail: { ...jobsDetail, summary: 'Cancel job (admin)' } })
    .post('/admin/jobs/:jobId/suspend', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      if (!user.IsAdmin && !user.IsOwner) {
        throw new AppError('Admin access required', 403, 'FORBIDDEN');
      }
      const job = await deps.jobRepo.requestSuspendAny(jobId);
      if (!job) {
        throw new AppError('Job not found or cannot be suspended', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    }, { detail: { ...jobsDetail, summary: 'Suspend job (admin)' } })
    .post('/admin/jobs/:jobId/resume', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      if (!user.IsAdmin && !user.IsOwner) {
        throw new AppError('Admin access required', 403, 'FORBIDDEN');
      }
      const job = await deps.jobRepo.requestResumeAny(jobId);
      if (!job) {
        throw new AppError('Job not found or cannot be resumed', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    }, { detail: { ...jobsDetail, summary: 'Resume job (admin)' } });
