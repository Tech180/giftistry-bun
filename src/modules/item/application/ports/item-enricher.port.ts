import type { ExtractMetadataUseCase } from '../../slices/metadata/use-cases/extract-metadata.use-case';

/** Published contract: enrich/grab metadata for an item or draft URL. */
export type ItemEnricherPort = Pick<ExtractMetadataUseCase, 'execute'>;
