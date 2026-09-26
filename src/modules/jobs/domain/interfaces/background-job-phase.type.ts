export type BackgroundJobPhase =
  | 'queued'
  | 'parsing'
  | 'creating_list'
  | 'adding_items'
  | 'grabbing_info'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'suspended';
