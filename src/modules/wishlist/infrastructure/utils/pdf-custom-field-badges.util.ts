function formatPredefinedKeyToLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function collectCustomFieldBadges(item: {
  Description?: string | null;
  Metadata?: {
    CustomFields?: {
      Predefined?: Record<string, string | null>;
      UserDefined?: Record<string, string>;
    };
  } | null;
}): string[] {
  const badges: string[] = [];

  const pushFields = (customFields: {
    Predefined?: Record<string, string | null>;
    UserDefined?: Record<string, string>;
  } | undefined) => {
    if (!customFields) {
      return;
    }

    const predefined = customFields.Predefined ?? {};
    for (const [key, val] of Object.entries(predefined)) {
      if (val != null && String(val).trim()) {
        const label = formatPredefinedKeyToLabel(key);
        badges.push(`${label}: ${String(val).trim()}`);
      }
    }

    const userDefined = customFields.UserDefined ?? {};
    for (const [name, val] of Object.entries(userDefined)) {
      if (val != null && typeof val === 'string' && val.trim()) {
        badges.push(`${name}: ${val.trim()}`);
      }
    }
  };

  if (item.Metadata?.CustomFields) {
    pushFields(item.Metadata.CustomFields);
    return badges;
  }

  if (item.Description) {
    const trimmed = item.Description.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          pushFields(parsed.CustomFields);
        }
      } catch {
        // Ignore malformed description JSON
      }
    }
  }

  return badges;
}
