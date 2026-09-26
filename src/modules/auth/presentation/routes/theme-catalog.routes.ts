import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import { getThemingEnginePath } from '@/common/utils/theming-engine-root.util';
import { THEME_CATALOG } from '../../../../../../theming-engine/src/domains/brands/theme-catalog';
import type { ThemeRoutesDeps } from '../interfaces/theme-routes-deps.interface';
import {
  assertFontFilename,
  createCachedCssResponse,
  createCachedFontResponse,
} from '../utils/theme-response.util';

export const themeCatalogRoutes = (deps: ThemeRoutesDeps) =>
  new Elysia()
    .get('/api/themes/core/css', async ({ request }) => {
      const filePath = getThemingEnginePath('dist/css/variables.css');
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        console.warn(`[WARNING] Core variables.css file not found at: ${filePath}`);
        throw new AppError('Core variables stylesheet not found.', 404, 'THEME_FILE_NOT_FOUND');
      }

      return createCachedCssResponse(await file.text(), request);
    })
    .get('/api/themes/core/fonts.css', async ({ request }) => {
      const filePath = getThemingEnginePath('dist/css/fonts.css');
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        console.warn(`[WARNING] fonts.css file not found at: ${filePath}`);
        throw new AppError('Fonts stylesheet not found.', 404, 'THEME_FILE_NOT_FOUND');
      }

      return createCachedCssResponse(await file.text(), request);
    })
    .get('/api/themes/fonts/:filename', async ({ params, request }) => {
      assertFontFilename(params.filename);
      const filePath = getThemingEnginePath('dist/fonts', params.filename);
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        throw new AppError('Font file not found.', 404, 'FONT_FILE_NOT_FOUND');
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      return createCachedFontResponse(bytes, request);
    })
    .get('/api/themes', () => ({
      success: true,
      Themes: THEME_CATALOG.map((entry) => ({
        id: entry.id,
        label: entry.label,
        category: entry.category,
        unlockMonth: entry.unlockMonth,
        unlockLastDay: entry.unlockLastDay,
        appearances: ['light', 'dark'],
      })),
    }))
    .get('/api/themes/:theme/:appearance/css', async ({ params, request }) => {
      const css = await deps.getThemeCss.execute(params.theme, params.appearance);
      return createCachedCssResponse(css, request);
    });
