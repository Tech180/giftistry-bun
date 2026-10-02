export interface PlaywrightFetchResult {
  html: string;
  capturedJson: unknown[];
  finalUrl: string;
  status?: number;
}
