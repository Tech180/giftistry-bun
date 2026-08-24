import { AppError } from '@/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';

export class TestNtfyUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async execute(): Promise<{ Topic: string }> {
    const config = this.serverConfigRepo.load();
    if (!config.NtfyEnabled) {
      throw new AppError('ntfy is not enabled', 400, 'BAD_REQUEST');
    }

    const baseUrl = (config.NtfyBaseUrl || 'https://ntfy.sh').replace(/\/$/, '');
    const prefix = (config.NtfyTopicPrefix || 'giftistry').replace(/\/$/, '');
    const topic = `${prefix}-test`;
    const headers: Record<string, string> = {
      Title: 'Giftistry ntfy test',
      Priority: 'default',
      'Content-Type': 'text/plain',
    };
    if (config.NtfyAuthToken) {
      headers.Authorization = `Bearer ${config.NtfyAuthToken}`;
    }

    const response = await fetch(`${baseUrl}/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers,
      body: 'This is a test notification from Giftistry.',
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        `Failed to publish ntfy test (${response.status}): ${text || response.statusText}`,
        400,
        'BAD_REQUEST'
      );
    }

    return { Topic: topic };
  }
}
