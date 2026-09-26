export interface EnrichExtractSnapshot {
  data: {
    title?: string | null;
    price?: number | null;
    description?: string | null;
    category?: string | null;
    categoryAlternatives?: string[];
    imageUrl?: string | null;
    predefinedFields?: Record<string, string | null>;
    userDefinedFields?: Record<string, string>;
  };
  websiteName?: string | null;
  finalUrl?: string | null;
  diagnostics: {
    source?: unknown;
    confidence?: unknown;
    fieldsFound?: unknown;
    aiPopulate?: unknown;
  };
}
