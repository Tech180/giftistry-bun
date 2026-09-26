export function remapIds(ids: string[] | undefined, idMap: Map<string, string>): string[] {
  if (!ids?.length) {
    return [];
  }
  return ids.map((id) => idMap.get(id)).filter((id): id is string => !!id);
}
