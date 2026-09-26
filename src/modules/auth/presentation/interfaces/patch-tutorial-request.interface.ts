export interface PatchTutorialRequest {
  FirstRunDismissed?: boolean;
  CompleteChapter?: string;
  SkipChapter?: string;
  ResetChapter?: string;
  ResetAll?: boolean;
}
