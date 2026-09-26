export interface RelationExportItem {
  Id: string;
  Name?: string;
  Description?: string | null;
  Metadata?: {
    LinkedItemIds?: string[];
    RelatedItemIds?: string[];
  } | null;
}
