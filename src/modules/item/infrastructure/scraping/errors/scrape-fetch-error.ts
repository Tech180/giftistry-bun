export class ScrapeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapeFetchError';
  }
}
