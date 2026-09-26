export class ScrapeError extends Error {
  readonly diagnostics?: {
    blocked?: boolean;
    validationReason?: string;
  };

  constructor(
    message: string,
    diagnostics?: { blocked?: boolean; validationReason?: string }
  ) {
    super(message);
    this.name = 'ScrapeError';
    this.diagnostics = diagnostics;
  }
}
