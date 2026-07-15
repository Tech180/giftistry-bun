export interface ThemeColorRgb {
  red: number;
  green: number;
  blue: number;
}

export interface ThemeColors {
  bg: ThemeColorRgb;
  border: ThemeColorRgb;
  text: ThemeColorRgb;
  textMuted: ThemeColorRgb;
  primary: ThemeColorRgb;
  
  success: ThemeColorRgb;
  successBg: ThemeColorRgb;
  successBorder: ThemeColorRgb;

  warning: ThemeColorRgb;
  warningBg: ThemeColorRgb;
  warningBorder: ThemeColorRgb;

  customFieldText: ThemeColorRgb;
  customFieldBg: ThemeColorRgb;
  customFieldBorder: ThemeColorRgb;
}

export interface ThemeResolver {
  resolveThemeColors(themeName: string): Promise<ThemeColors>;
}
