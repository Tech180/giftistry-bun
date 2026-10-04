import { Elysia } from 'elysia';
import { GetGiphyStatusUseCase } from '@/modules/giphy/application/use-cases/get-giphy-status.use-case';
import { SearchGifsUseCase } from '@/modules/giphy/application/use-cases/search-gifs.use-case';
import { ImportGifUseCase } from '@/modules/giphy/application/use-cases/import-gif.use-case';
import { ConfigGiphyApiKeyProvider } from './infrastructure/adapters/config-giphy-api-key-provider';
import { GiphyCdnImageFetcherAdapter } from './infrastructure/adapters/giphy-cdn-image-fetcher.adapter';
import { GiphyHttpCatalog } from './infrastructure/adapters/giphy-http-catalog.adapter';
import type { GiphyModuleDeps } from './interfaces/giphy-module-deps.interface';
import { giphyRoutes } from './presentation/giphy.routes';

export function createGiphyModule(deps: GiphyModuleDeps) {
  const giphyApiKeyProvider = new ConfigGiphyApiKeyProvider(deps.serverConfigRepo);
  const giphyCatalog = new GiphyHttpCatalog();
  const giphyCdnImageFetcher = new GiphyCdnImageFetcherAdapter();

  return new Elysia().use(
    giphyRoutes({
      useCases: {
        getGiphyStatus: new GetGiphyStatusUseCase(giphyApiKeyProvider),
        searchGifs: new SearchGifsUseCase(
          giphyApiKeyProvider,
          giphyCatalog,
          deps.assertUserCanUseCase
        ),
        importGif: new ImportGifUseCase(giphyCdnImageFetcher, deps.assertUserCanUseCase),
      },
    })
  );
}
