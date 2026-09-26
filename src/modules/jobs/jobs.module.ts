import { Elysia } from 'elysia';
import { StartWishlistImportJobUseCase } from './slices/import/use-cases/start-wishlist-import-job.use-case';
import { RunWishlistImportJobUseCase } from './slices/import/use-cases/run-wishlist-import-job.use-case';
import { StartItemEnrichJobUseCase } from './slices/enrich/use-cases/start-item-enrich-job.use-case';
import { RunItemEnrichJobUseCase } from './slices/enrich/use-cases/run-item-enrich-job.use-case';
import { StartItemSummarizeJobUseCase } from './slices/summarize/use-cases/start-item-summarize-job.use-case';
import { RunItemSummarizeJobUseCase } from './slices/summarize/use-cases/run-item-summarize-job.use-case';
import { BackgroundJobRunner } from './application/background-job-runner';
import type { JobsModuleDeps } from './interfaces/jobs-module-deps.interface';
import { jobsRoutes } from './presentation/jobs.routes';

export function createJobsModule(deps: JobsModuleDeps) {
  const jobRepo = deps.jobRepo;
  const jobProgressPublisher = deps.jobProgressPublisher;
  const startWishlistImport = new StartWishlistImportJobUseCase(
    jobRepo,
    deps.serverConfigRepo
  );
  const runWishlistImport = new RunWishlistImportJobUseCase(
    jobRepo,
    deps.itemJobs,
    deps.createWishlist,
    jobProgressPublisher,
    deps.serverConfigRepo
  );
  const startItemEnrich = new StartItemEnrichJobUseCase(
    jobRepo,
    deps.itemJobs,
    deps.serverConfigRepo
  );
  const runItemEnrich = new RunItemEnrichJobUseCase(
    jobRepo,
    deps.itemJobs,
    jobProgressPublisher,
    deps.notifyItemJobCompletion
  );
  const startItemSummarize = new StartItemSummarizeJobUseCase(
    jobRepo,
    deps.serverConfigRepo
  );
  const runItemSummarize = new RunItemSummarizeJobUseCase(
    jobRepo,
    deps.itemJobs,
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
        serverConfigRepo: deps.serverConfigRepo,
      })
    ),
    runner,
    jobRepo,
  };
}
