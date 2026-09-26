export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'INTERNAL_SERVER_ERROR'
  | (string & {});
