export interface ProductResearchInput {
  itemName: string;
  websiteName?: string;
  url?: string;
}

export interface ProductResearcher {
  research(input: ProductResearchInput): Promise<string>;
}
