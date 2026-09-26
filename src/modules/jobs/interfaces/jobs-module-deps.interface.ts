import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { ItemJobSupportPort } from '@/modules/item';
import type { CreateWishlistUseCase } from '@/modules/wishlist';
import type { ServerConfigRepository } from '@/modules/system';
import type { NotifyItemJobCompletionUseCase } from '../application/use-cases/notify-item-job-completion.use-case';
import type { JobProgressPublisher } from '../domain/ports/job-progress-publisher.port';
import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';

export interface JobsModuleDeps {
  itemJobs: ItemJobSupportPort;
  createWishlist: CreateWishlistUseCase;
  middleware: RouteMiddleware;
  jobRepo: BackgroundJobRepository;
  jobProgressPublisher: JobProgressPublisher;
  notifyItemJobCompletion?: NotifyItemJobCompletionUseCase;
  serverConfigRepo: ServerConfigRepository;
}
