export interface SafeFetchResult {
  status: number;
  finalUrl: string;
  contentType: string | null;
  body: string;
  truncated: boolean;
  bytes?: Uint8Array;
}
