export interface ExtractorContext {
  html: string;
  url: string;
  mode: 'full' | 'minimal';
  capturedJson?: unknown[];
}
