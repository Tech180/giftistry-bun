import { t } from 'elysia';

export const scrapeFieldSourceSchema = t.Union([
  t.Literal('json-ld'),
  t.Literal('open-graph'),
  t.Literal('meta'),
  t.Literal('dom'),
  t.Literal('embedded-json'),
  t.Literal('slug'),
  t.Literal('retailer'),
  t.Literal('network'),
  t.Literal('ai'),
  t.Literal('unknown'),
]);
