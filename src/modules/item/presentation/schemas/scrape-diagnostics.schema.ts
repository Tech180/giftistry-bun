import { t } from 'elysia';
import { scrapeFieldSourceSchema } from './scrape-field-source.schema';

export const scrapeDiagnosticsSchema = t.Object({
  Source: t.Optional(t.String()),
  Confidence: t.Optional(t.String()),
  FieldsFound: t.Optional(t.Array(t.String())),
  AiPopulate: t.Optional(t.String()),
  Blocked: t.Optional(t.Boolean()),
  ValidationReason: t.Optional(t.String()),
  Outcome: t.Optional(t.String()),
  NeedsReview: t.Optional(t.Boolean()),
  Warnings: t.Optional(t.Array(t.String())),
  FieldSources: t.Optional(
    t.Record(
      t.String(),
      scrapeFieldSourceSchema
    )
  ),
  DroppedFields: t.Optional(t.Array(t.String())),
});
