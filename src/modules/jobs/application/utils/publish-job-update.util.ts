import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { BackgroundJobItem } from '../../domain/interfaces/background-job-item.interface';
import type { UpdateBackgroundJobProgressPatch } from '../../domain/interfaces/update-background-job-progress-patch.interface';
import type { BackgroundJobRepository } from '../../domain/ports/background-job.repository';
import type { JobProgressPublisher } from '../../domain/ports/job-progress-publisher.port';
import type { NotifyItemJobCompletionUseCase } from '../use-cases/notify-item-job-completion.use-case';

export async function publishJobProgress(
  jobRepo: BackgroundJobRepository,
  publisher: JobProgressPublisher,
  id: string,
  patch: UpdateBackgroundJobProgressPatch,
  items?: BackgroundJobItem[] | null
): Promise<void> {
  const updated = await jobRepo.updateProgress(id, patch);
  if (updated) {
    publisher.publish(updated, 'job.progress', items);
  }
}

export async function failBackgroundJob(
  jobRepo: BackgroundJobRepository,
  publisher: JobProgressPublisher,
  id: string,
  message: string,
  notify?: NotifyItemJobCompletionUseCase
): Promise<void> {
  const updated = await jobRepo.updateProgress(id, {
    status: 'failed',
    phase: 'failed',
    message,
    error: message,
    finishedAt: new Date(),
  });
  if (updated) {
    publisher.publish(updated, 'job.failed');
    await notifyItemJobTerminal(notify, updated);
  }
}

export async function notifyItemJobTerminal(
  notify: NotifyItemJobCompletionUseCase | undefined,
  job: BackgroundJob
): Promise<void> {
  if (!notify) {
    return;
  }
  try {
    await notify.execute(job);
  } catch (err) {
    console.error('[Jobs] Failed to notify item job completion:', err);
  }
}
