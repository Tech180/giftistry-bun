import {
  AI_IMPORT_CHUNK_ITEM_LIMIT_MAX,
  AI_IMPORT_CHUNK_ITEM_LIMIT_MIN,
  DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT,
} from '../constants/ai-import-chunk.constant';
import {
  AI_COMPLETION_TIMEOUT_MAX_MS,
  AI_COMPLETION_TIMEOUT_MIN_MS,
  AI_CONNECT_TIMEOUT_MAX_MS,
  AI_CONNECT_TIMEOUT_MIN_MS,
  DEFAULT_AI_COMPLETION_TIMEOUT_MS,
  DEFAULT_AI_CONNECT_TIMEOUT_MS,
} from '../constants/ai-timeout.constant';
import {
  DEFAULT_GRAB_INFO_ACTIVE_STREAM_LIMIT,
  DEFAULT_GRAB_INFO_CONCURRENCY,
  GRAB_INFO_ACTIVE_STREAM_LIMIT_MAX,
  GRAB_INFO_ACTIVE_STREAM_LIMIT_MIN,
  GRAB_INFO_CONCURRENCY_MAX,
  GRAB_INFO_CONCURRENCY_MIN,
} from '../constants/grab-info.constant';
import {
  DEFAULT_SCRAPE_FETCH_TIMEOUT_MS,
  DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS,
  SCRAPE_FETCH_TIMEOUT_MAX_MS,
  SCRAPE_FETCH_TIMEOUT_MIN_MS,
  SCRAPE_PLAYWRIGHT_TIMEOUT_MAX_MS,
  SCRAPE_PLAYWRIGHT_TIMEOUT_MIN_MS,
} from '../constants/scrape-timeout.constant';
import { clampNumber } from './clamp-number.util';

export function clampAiImportChunkItemLimit(value: unknown): number {
  return clampNumber(value, {
    min: AI_IMPORT_CHUNK_ITEM_LIMIT_MIN,
    max: AI_IMPORT_CHUNK_ITEM_LIMIT_MAX,
    fallback: DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT,
  });
}

export function clampAiCompletionTimeoutMs(value: unknown): number {
  return clampNumber(value, {
    min: AI_COMPLETION_TIMEOUT_MIN_MS,
    max: AI_COMPLETION_TIMEOUT_MAX_MS,
    fallback: DEFAULT_AI_COMPLETION_TIMEOUT_MS,
  });
}

export function clampAiConnectTimeoutMs(value: unknown): number {
  return clampNumber(value, {
    min: AI_CONNECT_TIMEOUT_MIN_MS,
    max: AI_CONNECT_TIMEOUT_MAX_MS,
    fallback: DEFAULT_AI_CONNECT_TIMEOUT_MS,
  });
}

export function clampScrapeFetchTimeoutMs(value: unknown): number {
  return clampNumber(value, {
    min: SCRAPE_FETCH_TIMEOUT_MIN_MS,
    max: SCRAPE_FETCH_TIMEOUT_MAX_MS,
    fallback: DEFAULT_SCRAPE_FETCH_TIMEOUT_MS,
  });
}

export function clampScrapePlaywrightTimeoutMs(value: unknown): number {
  return clampNumber(value, {
    min: SCRAPE_PLAYWRIGHT_TIMEOUT_MIN_MS,
    max: SCRAPE_PLAYWRIGHT_TIMEOUT_MAX_MS,
    fallback: DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS,
  });
}

export function clampGrabInfoConcurrency(value: unknown): number {
  return clampNumber(value, {
    min: GRAB_INFO_CONCURRENCY_MIN,
    max: GRAB_INFO_CONCURRENCY_MAX,
    fallback: DEFAULT_GRAB_INFO_CONCURRENCY,
  });
}

export function clampGrabInfoActiveStreamLimit(value: unknown): number {
  return clampNumber(value, {
    min: GRAB_INFO_ACTIVE_STREAM_LIMIT_MIN,
    max: GRAB_INFO_ACTIVE_STREAM_LIMIT_MAX,
    fallback: DEFAULT_GRAB_INFO_ACTIVE_STREAM_LIMIT,
  });
}
