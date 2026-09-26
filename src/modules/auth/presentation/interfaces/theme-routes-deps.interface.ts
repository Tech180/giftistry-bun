import type { GetThemeCssUseCase } from '../../slices/themes/use-cases/get-theme-css.use-case';

export interface ThemeRoutesDeps {
  getThemeCss: GetThemeCssUseCase;
}
