export interface ApplyImportedItemMetadataRow {
  itemId: string;
  category?: string | null;
  linkedPeerNames?: string[];
  relatedPeerNames?: string[];
  audienceLabel?: string;
  suggestionLabel?: string;
}
