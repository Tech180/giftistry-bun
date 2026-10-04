import { isPopulatedExportString } from './is-populated-export-string.util';

export function appendTxtLabeledLine(
  sections: string[],
  label: string,
  value: string
): void {
  if (!isPopulatedExportString(value)) {
    return;
  }
  sections.push(`    ${label}: ${value.trim()}`);
}
