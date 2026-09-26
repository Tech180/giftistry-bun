export class ScrapePlaywrightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapePlaywrightError';
  }
}
