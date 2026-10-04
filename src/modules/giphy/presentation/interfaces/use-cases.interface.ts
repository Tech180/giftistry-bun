import type { GetGiphyStatusUseCase } from '@/modules/giphy/application/use-cases/get-giphy-status.use-case';
import type { ImportGifUseCase } from '@/modules/giphy/application/use-cases/import-gif.use-case';
import type { SearchGifsUseCase } from '@/modules/giphy/application/use-cases/search-gifs.use-case';

export interface UseCases {
  getGiphyStatus: GetGiphyStatusUseCase;
  searchGifs: SearchGifsUseCase;
  importGif: ImportGifUseCase;
}
