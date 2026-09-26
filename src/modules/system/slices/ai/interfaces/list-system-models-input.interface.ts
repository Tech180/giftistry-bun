import type { ListSystemModelsProvider } from '../types/list-system-models-provider.type';

export interface ListSystemModelsInput {
  Provider: ListSystemModelsProvider | string;
  Endpoint?: string | null;
  ApiKey?: string | null;
}
