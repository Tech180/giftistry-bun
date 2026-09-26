export interface ItemLink {
  Id: string;
  ItemId: string;
  Url: string;
  RetailerName: string | null;
  ExtractedPrice: number | null;
  ExtractedImageUrl: string | null;
}
