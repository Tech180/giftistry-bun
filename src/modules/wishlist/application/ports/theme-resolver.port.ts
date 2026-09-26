import type { ThemeColors } from '../interfaces/theme-colors.interface';

export interface ThemeResolver {
  resolveThemeColors(themeName: string): Promise<ThemeColors>;
}
