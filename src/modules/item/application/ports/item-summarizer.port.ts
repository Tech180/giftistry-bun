import type { SummarizeItemDescriptionUseCase } from '../../slices/metadata/use-cases/summarize-item-description.use-case';

/** Published contract: AI summarize an item description. */
export type ItemSummarizerPort = Pick<SummarizeItemDescriptionUseCase, 'execute'>;
