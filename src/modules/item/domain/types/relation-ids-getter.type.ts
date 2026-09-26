import type { RelationExportItem } from '../interfaces/relation-export-item.interface';

export type RelationIdsGetter = (item: RelationExportItem) => string[];
