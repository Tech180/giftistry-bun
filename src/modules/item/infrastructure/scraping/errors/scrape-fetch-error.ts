export class ScrapeFetchError extends Error {
  readonly status?: number;
  readonly body?: string;
  readonly finalUrl?: string;

  constructor(message: string, status?: number, body?: string, finalUrl?: string) {
    super(message);
    this.name = 'ScrapeFetchError';
    this.status = status;
    this.body = body;
    this.finalUrl = finalUrl;
  }
}
