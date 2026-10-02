export type FetchOutcomeKind =
  | 'ok'
  | 'blocked'
  | 'not-found'
  | 'login-wall'
  | 'geo-blocked'
  | 'timeout'
  | 'unsafe-url'
  | 'non-html'
  | 'busy'
  | 'empty'
  | 'error';
