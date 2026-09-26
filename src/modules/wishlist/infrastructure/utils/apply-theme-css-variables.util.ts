import { THEME_CSS_VAR_REGEX } from '../constants/theme-css.constant';

/** Parse `--theme-*` declarations from theming-engine CSS into a flat map. */
export function applyThemeCssVariables(content: string, target: Record<string, string>): void {
  const regex = new RegExp(THEME_CSS_VAR_REGEX.source, THEME_CSS_VAR_REGEX.flags);
  let match;
  while ((match = regex.exec(content)) !== null) {
    target[match[1]!.trim()] = match[2]!.trim();
  }
}
