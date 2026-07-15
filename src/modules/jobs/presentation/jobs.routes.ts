import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import { toJobPublicView } from '../domain/background-job.entity';
import type { BackgroundJob } from '../domain/background-job.entity';
import type { StartWishlistImportJobUseCase } from '../application/start-wishlist-import-job.use-case';
import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';

export interface JobsRouteDeps {
  startWishlistImport: StartWishlistImportJobUseCase;
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
    .get('/jobs/mine', async ({ getAuthUser }) => {
      const user = await getAuthUser();
      const jobs = await deps.jobRepo.listActiveByUserId(user.userId);
      return { success: true, data: await toViews(deps.jobRepo, jobs) };
    })
    .get('/admin/jobs', async ({ getAuthUser }) => {
      const user = await getAuthUser();
      if (!user.IsAdmin && !user.IsOwner) {
        throw new AppError('Admin access required', 403, 'FORBIDDEN');
      }
      const jobs = await deps.jobRepo.listActiveAll();
      return { success: true, data: await toViews(deps.jobRepo, jobs) };
    })
    .get('/jobs/:jobId', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.findById(jobId);
      if (!job || job.UserId !== user.userId) {
        throw new AppError('Job not found', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    })
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
      }
    )
    .post('/jobs/:jobId/cancel', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.requestCancel(jobId, user.userId);
      if (!job) {
        throw new AppError('Job not found', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    })
    .post('/jobs/:jobId/suspend', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.requestSuspend(jobId, user.userId);
      if (!job) {
        throw new AppError('Job not found or cannot be suspended', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    })
    .post('/jobs/:jobId/resume', async ({ getAuthUser, params: { jobId } }) => {
      const user = await getAuthUser();
      const job = await deps.jobRepo.requestResume(jobId, user.userId);
      if (!job) {
        throw new AppError('Job not found or cannot be resumed', 404, 'NOT_FOUND');
      }
      const items = await deps.jobRepo.listItems(jobId);
      return { success: true, data: toJobPublicView(job, items) };
    })
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
    })
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
    })
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
    });
