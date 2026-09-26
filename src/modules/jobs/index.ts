/** Public barrel for the jobs module. Prefer this over deep imports. */
export type { BackgroundJobRepository } from './domain/ports/background-job.repository';
export type { JobProgressPublisher } from './domain/ports/job-progress-publisher.port';
export { BackgroundJobRunner } from './application/background-job-runner';
export { NotifyItemJobCompletionUseCase } from './application/use-cases/notify-item-job-completion.use-case';
export type { JobProgressRate } from './domain/interfaces/job-progress-rate.interface';
export { tokensPerSecondRate } from './domain/utils/job-progress-rate.util';
export { createJobsModule } from './jobs.module';
export type { JobsModuleDeps } from './interfaces/jobs-module-deps.interface';
export { publishRealtimeFanout } from './infrastructure/adapters/postgres-realtime-fanout';
export {
  startPostgresRealtimeListener,
  handleFanoutNotify,
} from './infrastructure/adapters/postgres-realtime-listener';
