export type CorpusPageType = 'product' | 'block' | 'error';

export interface CorpusExpected {
  pageType: CorpusPageType;
  title: string[];
  price: number | null;
  currency: string | null;
  imageHost: string | null;
  availability: string | null;
  shouldBeBlocked: boolean;
}
