export interface DescriptionSummarizerInput {
  itemName: string;
  category?: string;
  url?: string;
  price?: number | null;
  websiteName?: string;
  existingNotes?: string;
  itemContext: string;
}
