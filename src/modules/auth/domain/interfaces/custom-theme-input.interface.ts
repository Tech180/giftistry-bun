export interface CustomThemeInput {
  id: string;
  name: string;
  colors: Record<string, string>;
  advanced?: Record<string, unknown>;
}
