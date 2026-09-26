/** Matches `--theme-<name>: <value>;` declarations in theming-engine CSS. */
export const THEME_CSS_VAR_REGEX = /--theme-([\w-]+)\s*:\s*([^;]+);/g;
