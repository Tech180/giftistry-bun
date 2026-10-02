import type { FetchPageResult } from '../../interfaces/fetch-page-result.interface';

export type HttpFetchFn = (url: string, timeoutMs?: number) => Promise<FetchPageResult>;
