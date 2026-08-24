import { Elysia } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import type { ItemUseCases } from '@/modules/item/application/item-use-cases.interface';
import type { CreateWishlistUseCase } from '@/modules/wishlist/application/create-wishlist.use-case';
import type { JobProgressPublisher } from './domain/ports/job-progress-publisher.port';
import { PostgresBackgroundJobRepository } from './infrastructure/postgres-background-job.repository';
import { WebsocketJobProgressPublisher } from './infrastructure/websocket-job-progress-publisher';
import { StartWishlistImportJobUseCase } from './application/start-wishlist-import-job.use-case';
import { RunWishlistImportJobUseCase } from './application/run-wishlist-import-job.use-case';
import { StartItemEnrichJobUseCase } from './application/start-item-enrich-job.use-case';
import { RunItemEnrichJobUseCase } from './application/run-item-enrich-job.use-case';
import { StartItemSummarizeJobUseCase } from './application/start-item-summarize-job.use-case';
import { RunItemSummarizeJobUseCase } from './application/run-item-summarize-job.use-case';
import type { NotifyItemJobCompletionUseCase } from './application/notify-item-job-completion.use-case';
import { BackgroundJobRunner } from './application/background-job-runner';
import { jobsRoutes } from './presentation/jobs.routes';

export interface JobsModuleDeps {
  itemUseCases: ItemUseCases;
  createWishlist: CreateWishlistUseCase;
  middleware: RouteMiddleware;
  jobRepo?: PostgresBackgroundJobRepository;
  jobProgressPublisher?: JobProgressPublisher;
  notifyItemJobCompletion?: NotifyItemJobCompletionUseCase;
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
  const startItemEnrich = new StartItemEnrichJobUseCase(jobRepo, deps.itemUseCases);
  const runItemEnrich = new RunItemEnrichJobUseCase(
    jobRepo,
    deps.itemUseCases,
    jobProgressPublisher,
    deps.notifyItemJobCompletion
  );
  const startItemSummarize = new StartItemSummarizeJobUseCase(jobRepo);
  const runItemSummarize = new RunItemSummarizeJobUseCase(
    jobRepo,
    deps.itemUseCases,
    jobProgressPublisher,
    deps.notifyItemJobCompletion
  );
  const runner = new BackgroundJobRunner(
    jobRepo,
    runWishlistImport,
    runItemEnrich,
    runItemSummarize
  );

  return {
    module: new Elysia().use(
      jobsRoutes({
        startWishlistImport,
        startItemEnrich,
        startItemSummarize,
        jobRepo,
        middleware: deps.middleware,
      })
    ),
    runner,
    jobRepo,
  };
}
