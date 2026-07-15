import { Elysia } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import type { ItemUseCases } from '@/modules/item/application/item-use-cases.interface';
import type { CreateWishlistUseCase } from '@/modules/wishlist/application/create-wishlist.use-case';
import type { JobProgressPublisher } from './domain/ports/job-progress-publisher.port';
import { PostgresBackgroundJobRepository } from './infrastructure/postgres-background-job.repository';
import { WebsocketJobProgressPublisher } from './infrastructure/websocket-job-progress-publisher';
import { StartWishlistImportJobUseCase } from './application/start-wishlist-import-job.use-case';
import { RunWishlistImportJobUseCase } from './application/run-wishlist-import-job.use-case';
import { BackgroundJobRunner } from './application/background-job-runner';
import { jobsRoutes } from './presentation/jobs.routes';

export interface JobsModuleDeps {
  itemUseCases: ItemUseCases;
  createWishlist: CreateWishlistUseCase;
  middleware: RouteMiddleware;
  jobRepo?: PostgresBackgroundJobRepository;
  jobProgressPublisher?: JobProgressPublisher;
}

export function createJobsModule(deps: JobsModuleDeps) {
  const jobRepo = deps.jobRepo ?? new PostgresBackgroundJobRepository();
  const jobProgressPublisher =
    deps.jobProgressPublisher ?? new WebsocketJobProgressPublisher();
  const startWishlistImport = new StartWishlistImportJobUseCase(jobRepo);
  const runWishlistImport = new RunWishlistImportJobUseCase(
    jobRepo,
    deps.itemUseCases,
    deps.createWishlist,
    jobProgressPublisher
  );
  const runner = new BackgroundJobRunner(jobRepo, runWishlistImport);

  return {
    module: new Elysia().use(
      jobsRoutes({
        startWishlistImport,
        jobRepo,
        middleware: deps.middleware,
      })
    ),
    runner,
    jobRepo,
  };
}
