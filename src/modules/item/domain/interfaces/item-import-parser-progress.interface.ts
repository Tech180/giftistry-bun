export interface ItemImportParserProgress {
  tokensPerSecond: number | null;
  chunkIndex?: number;
  chunkTotal?: number;
}
