export type ListChangedReason =
  | 'item.created'
  | 'item.updated'
  | 'item.deleted'
  | 'claim.changed'
  | 'item.links'
  | 'item.related'
  | 'item.substitution'
  | 'list.updated';
