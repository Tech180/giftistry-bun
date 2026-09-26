export function hexOrRgbToRgbString(colorStr: string): string {
  const str = colorStr.trim().toLowerCase();
  if (str.startsWith('rgb')) {
    const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return `${match[1]!}, ${match[2]!}, ${match[3]!}`;
    }
  }
  if (str.startsWith('#')) {
    const hex = str.substring(1);
    let r = 0, g = 0, b = 0;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0]! + hex[0]!, 16);
      g = parseInt(hex[1]! + hex[1]!, 16);
      b = parseInt(hex[2]! + hex[2]!, 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    return `${r}, ${g}, ${b}`;
  }
  return '0, 0, 0';
}
