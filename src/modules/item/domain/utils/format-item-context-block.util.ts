export function formatItemContextBlock(input: {
  priority?: number | null;
  customFields?: {
    Predefined?: Record<string, string | null>;
    UserDefined?: Record<string, string>;
  };
  variations?: { Name: string; Quantity: number }[];
  desiredQuantity?: number;
}): string {
  const lines: string[] = [];

  if (input.priority !== undefined && input.priority !== null) {
    lines.push(`Priority: ${input.priority}`);
  }

  if (input.desiredQuantity !== undefined && input.desiredQuantity !== null) {
    lines.push(`Desired Quantity: ${input.desiredQuantity}`);
  }

  const predefined = input.customFields?.Predefined ?? {};
  const predefinedEntries = Object.entries(predefined).filter(
    ([, value]) => value != null && String(value).trim()
  );
  if (predefinedEntries.length > 0) {
    lines.push('Predefined fields:');
    for (const [key, value] of predefinedEntries) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  const userDefined = input.customFields?.UserDefined ?? {};
  const userDefinedEntries = Object.entries(userDefined).filter(
    ([, value]) => value.trim()
  );
  if (userDefinedEntries.length > 0) {
    lines.push('Custom fields:');
    for (const [key, value] of userDefinedEntries) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  if (input.variations?.length) {
    lines.push('Variations:');
    for (const variation of input.variations) {
      lines.push(`- ${variation.Name}: ${variation.Quantity}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : 'None provided';
}
