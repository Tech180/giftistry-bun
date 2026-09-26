import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';
import { PROSE_CUSTOM_FIELD_KEYS } from '../constants/prose-custom-field-keys.constant';

function looksLikeProse(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length >= 48) return true;
  if (/[.!?]/.test(trimmed) && trimmed.split(/\s+/).length >= 6) return true;
  return false;
}

function takeProseFromMaps(
  predefined: Record<string, string>,
  userDefined: Record<string, string>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    for (const map of [userDefined, predefined]) {
      const value = map[key]?.trim();
      if (!value) continue;
      if (!looksLikeProse(value) && key === 'Features') continue;
      delete map[key];
      return value;
    }
  }
  return null;
}

/**
 * When the model omits Description (or put copy under Note/Summary/Features),
 * promote that prose into description and remove the redundant custom field.
 */
export function promoteProseCustomFieldsToDescription(
  data: ExtractedMetadata
): ExtractedMetadata {
  const predefinedFields = { ...(data.predefinedFields ?? {}) };
  const userDefinedFields = { ...(data.userDefinedFields ?? {}) };

  let description = data.description?.trim() || null;
  if (!description) {
    description =
      takeProseFromMaps(predefinedFields, userDefinedFields, PROSE_CUSTOM_FIELD_KEYS) ??
      takeProseFromMaps(predefinedFields, userDefinedFields, ['Features']);
  } else {
    // Description already set — drop duplicate Note/Summary prose fields.
    for (const key of PROSE_CUSTOM_FIELD_KEYS) {
      delete predefinedFields[key];
      delete userDefinedFields[key];
    }
  }

  return {
    ...data,
    description,
    predefinedFields,
    userDefinedFields,
  };
}
