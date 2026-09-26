import type { CustomTheme } from '../../domain/interfaces/custom-theme.interface';
import type { CustomThemeRow } from '../interfaces/custom-theme-row.interface';
import { parseJsonField } from '@/common/utils/parse-json-field.util';

export function mapCustomThemeRow(row: CustomThemeRow): CustomTheme {
  return {
    Id: row.Id,
    Name: row.Name,
    Colors: parseJsonField<Record<string, string>>(row.Colors, {}),
    Advanced: parseJsonField<Record<string, unknown>>(row.Advanced, {}),
  };
}
