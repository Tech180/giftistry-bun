import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { ServerConfigRepository } from '@/modules/system';
import type { BackgroundJobRepository } from '../../domain/ports/background-job.repository';
import type { StartWishlistImportJobUseCase } from '../../slices/import/use-cases/start-wishlist-import-job.use-case';
import type { StartItemEnrichJobUseCase } from '../../slices/enrich/use-cases/start-item-enrich-job.use-case';
import type { StartItemSummarizeJobUseCase } from '../../slices/summarize/use-cases/start-item-summarize-job.use-case';

export interface JobsRouteDeps {
  startWishlistImport: StartWishlistImportJobUseCase;
  startItemEnrich: StartItemEnrichJobUseCase;
  startItemSummarize: StartItemSummarizeJobUseCase;
  jobRepo: BackgroundJobRepository;
  middleware: RouteMiddleware;
  serverConfigRepo: ServerConfigRepository;
}
