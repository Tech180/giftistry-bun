export interface BuildApiEnvelopeResponseParams {
  responseValue: unknown;
  set: {
    status?: number | string;
    headers?: unknown;
  };
  correlationId: string;
  request: Request;
}
