import type { BackgroundJobRepository } from '../../domain/ports/background-job.repository';
import type { NotifyItemJobCompletionUseCase } from '../../application/use-cases/notify-item-job-completion.use-case';
import type { RealtimeWsPublisher } from './realtime-ws-publisher.type';

export interface PostgresRealtimeListenerDeps {
  jobRepo: BackgroundJobRepository;
  publishToWs: RealtimeWsPublisher;
  notifyItemJobCompletion?: NotifyItemJobCompletionUseCase;
}
