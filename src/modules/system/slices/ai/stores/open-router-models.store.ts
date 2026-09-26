import type { OpenRouterModelsCache } from '../interfaces/open-router-models-cache.interface';

let openRouterCache: OpenRouterModelsCache | null = null;

export function getOpenRouterModelsCache(): OpenRouterModelsCache | null {
  return openRouterCache;
}

export function setOpenRouterModelsCache(cache: OpenRouterModelsCache): void {
  openRouterCache = cache;
}

export function clearOpenRouterModelsCache(): void {
  openRouterCache = null;
}
