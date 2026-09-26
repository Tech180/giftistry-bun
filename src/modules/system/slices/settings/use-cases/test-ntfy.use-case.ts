import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';

export class TestNtfyUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async execute(): Promise<{ Topic: string }> {
    const config = this.serverConfigRepo.load();
    if (!config.NtfyEnabled) {
      throw new AppError('ntfy is not enabled', DOMAIN_ERROR_STATUS.BAD_REQUEST, 'BAD_REQUEST');
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
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    return { Topic: topic };
  }
}
