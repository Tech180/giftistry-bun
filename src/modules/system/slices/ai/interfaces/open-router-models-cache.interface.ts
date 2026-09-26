import type { SystemModelView } from './system-model-view.interface';

export interface OpenRouterModelsCache {
  expiresAt: number;
  models: SystemModelView[];
}
