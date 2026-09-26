import type { BackgroundJobRepository } from '../../domain/ports/background-job.repository';
import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { ServerConfigRepository } from '@/modules/system';
import { mapToJobPublicView } from '../../application/utils/map-to-job-public-view.util';

export async function toJobPublicViews(
  jobRepo: BackgroundJobRepository,
  jobs: BackgroundJob[],
  serverConfigRepo: ServerConfigRepository
) {
  return Promise.all(
    jobs.map(async (job) => {
      const items = await jobRepo.listItems(job.Id);
      return mapToJobPublicView(job, items, serverConfigRepo);
    })
  );
}
