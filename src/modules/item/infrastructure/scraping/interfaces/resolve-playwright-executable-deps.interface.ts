export interface ResolvePlaywrightExecutableDeps {
  exists?: (path: string) => boolean;
  homeDir?: string;
  isNixOs?: boolean;
}
