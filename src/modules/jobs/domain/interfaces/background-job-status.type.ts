export type BackgroundJobStatus =
  | 'queued'
  | 'running'
  | 'suspended'
  | 'completed'
  | 'failed'
  | 'cancelled';
