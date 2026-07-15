export interface SystemModelView {
  Id: string;
  Name: string;
  Company: string;
  DisplayName: string;
}

export function mapOpenRouterCatalogToModels(rawData: unknown[]): SystemModelView[] {
  const mapped = rawData
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const m = entry as {
        architecture?: { output_modalities?: string[]; modality?: string };
      };
      const outMods = m.architecture?.output_modalities;
      const modality = m.architecture?.modality;
      if (outMods && outMods.includes('image')) return false;
      if (modality && modality.endsWith('->image')) return false;
      return true;
    })
    .map((entry) => {
      const m = entry as { id?: string; name?: string };
      const id = String(m.id ?? '').trim();
      const fullName = String(m.name || m.id || '').trim() || id;
      let company = 'Other';
      let displayName = fullName;
      if (fullName.includes(':')) {
        const parts = fullName.split(':');
        company = parts[0].trim() || 'Other';
        displayName = parts.slice(1).join(':').trim() || fullName;
      }
      return {
        Id: id,
        Name: fullName,
        Company: company,
        DisplayName: displayName,
      };
    })
    .filter((m) => !!m.Id);

  mapped.sort((a, b) => a.DisplayName.localeCompare(b.DisplayName));
  return mapped;
}

export function mapLocalModelIdsToModels(ids: string[]): SystemModelView[] {
  return ids
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => ({
      Id: id,
      Name: id,
      Company: 'Local',
      DisplayName: id,
    }));
}
