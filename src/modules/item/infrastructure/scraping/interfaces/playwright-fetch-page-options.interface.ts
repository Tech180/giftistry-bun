export interface PlaywrightFetchPageOptions {
  postGateUrl?: string;
  /** Aborts in-flight navigation when signaled (deadline / caller cancel). */
  signal?: AbortSignal;
  /** Absolute epoch-ms deadline; navigation retries and waits are bounded by what remains. */
  deadlineAt?: number;
}
