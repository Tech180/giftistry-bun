export function modelMatchesList(modelName: string, listedId: string): boolean {
  return (
    listedId === modelName ||
    listedId.endsWith(`/${modelName}`) ||
    listedId.split(':')[0] === modelName
  );
}
