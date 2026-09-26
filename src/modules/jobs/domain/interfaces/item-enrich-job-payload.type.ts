export type ItemEnrichJobPayload =
  | { intent: 'create-from-url'; listId: string; url: string }
  | { intent: 'update-item'; listId: string; url: string; itemId: string; writeBack: true }
  | { intent: 'draft-populate'; listId: string; url: string; writeBack: false };
