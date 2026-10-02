export function htmlLooksLikeContinueShoppingShell(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes('continue shopping') ||
    lower.includes('click the button below to continue')
  );
}
