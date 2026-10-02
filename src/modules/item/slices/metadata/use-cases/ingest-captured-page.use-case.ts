import { DomainError } from '@/common/domain/errors/domain-error';
import { assertSafeScrapeUrlOrThrow } from '../../../domain/utils/assert-safe-scrape-url.util';
import { MAX_CAPTURE_PAGE_HTML_BYTES } from '../../../domain/constants/max-capture-page-html-bytes.constant';
import type { ExtractMetadataUseCase } from './extract-metadata.use-case';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import type { ScrapeCaptureInput } from '../../../domain/interfaces/scrape-capture-input.interface';

export class IngestCapturedPageUseCase {
  constructor(private extractMetadata: ExtractMetadataUseCase) {}

  async execute(
    url: string,
    capture: ScrapeCaptureInput,
    userId: string,
    options: { listId?: string; deadlineMs?: number } = {}
  ): Promise<ScrapeResult> {
    assertSafeScrapeUrlOrThrow(url);

    const htmlBytes = Buffer.byteLength(capture.html, 'utf8');
    if (htmlBytes > MAX_CAPTURE_PAGE_HTML_BYTES) {
      throw new DomainError(
        `Capture HTML exceeds ${MAX_CAPTURE_PAGE_HTML_BYTES} bytes`,
        'VALIDATION'
      );
    }

    if (!capture.html.trim()) {
      throw new DomainError('Capture HTML is required', 'VALIDATION');
    }

    return this.extractMetadata.execute(url, userId, {
      listId: options.listId,
      deadlineMs: options.deadlineMs,
      capture: {
        html: capture.html,
        capturedJson: capture.capturedJson,
      },
    });
  }
}
