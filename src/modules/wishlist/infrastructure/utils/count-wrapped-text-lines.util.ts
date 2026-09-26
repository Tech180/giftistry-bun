export function countWrappedTextLines(
  text: string,
  font: { widthOfTextAtSize: (value: string, size: number) => number },
  size: number,
  maxWidth: number
): number {
  if (!text || maxWidth <= 0) {
    return 0;
  }

  const words = text.split(' ').filter(Boolean);
  if (words.length === 0) {
    return 0;
  }

  let lines = 1;
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, size);
    if (width > maxWidth && currentLine) {
      lines += 1;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  return lines;
}
