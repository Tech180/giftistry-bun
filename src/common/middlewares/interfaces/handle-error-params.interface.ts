export interface HandleErrorParams {
  code?: string | number;
  error: unknown;
  set: { status?: number | string };
  correlationId?: string;
}
