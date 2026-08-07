import JSZip from 'jszip';

/** Prefer hyperlink href over display text (e.g. "amazon.com"). */
export function cellValueToText(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);

  const record = value as { text?: unknown; hyperlink?: unknown; result?: unknown };
  if (typeof record.hyperlink === 'string' && record.hyperlink.trim()) {
    return record.hyperlink.trim();
  }
  if (typeof record.text === 'string') {
    return record.text;
  }
  if (typeof record.result === 'string' || typeof record.result === 'number') {
    return String(record.result);
  }
  return String(value);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function columnLettersToIndex(letters: string): number {
  let index = 0;
  for (const char of letters.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) return null;
  return {
    col: columnLettersToIndex(match[1]),
    row: Number(match[2]),
  };
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let siMatch: RegExpExecArray | null;
  while ((siMatch = siRe.exec(xml))) {
    const texts: string[] = [];
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi;
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRe.exec(siMatch[1]))) {
      texts.push(decodeXmlEntities(tMatch[1]));
    }
    strings.push(texts.join(''));
  }
  return strings;
}

function parseHyperlinkTargets(sheetXml: string, relsXml: string | null): Map<string, string> {
  const relTargets = new Map<string, string>();
  if (relsXml) {
    const relRe =
      /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*>/gi;
    let relMatch: RegExpExecArray | null;
    while ((relMatch = relRe.exec(relsXml))) {
      relTargets.set(relMatch[1], decodeXmlEntities(relMatch[2]));
    }
    const relReAlt =
      /<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"[^>]*>/gi;
    while ((relMatch = relReAlt.exec(relsXml))) {
      if (!relTargets.has(relMatch[2])) {
        relTargets.set(relMatch[2], decodeXmlEntities(relMatch[1]));
      }
    }
  }

  const hyperlinks = new Map<string, string>();
  const hyperlinkRe = /<hyperlink\b([^>]*)\/?>/gi;
  let hyperMatch: RegExpExecArray | null;
  while ((hyperMatch = hyperlinkRe.exec(sheetXml))) {
    const attrs = hyperMatch[1];
    const ref = /\bref="([^"]+)"/i.exec(attrs)?.[1];
    if (!ref) continue;
    const inlineTarget = /\bTarget="([^"]+)"/i.exec(attrs)?.[1];
    const rId =
      /\br:id="([^"]+)"/i.exec(attrs)?.[1] || /\bid="([^"]+)"/i.exec(attrs)?.[1];
    const target = inlineTarget
      ? decodeXmlEntities(inlineTarget)
      : rId
        ? relTargets.get(rId)
        : undefined;
    if (target?.trim()) {
      hyperlinks.set(ref.toUpperCase(), target.trim());
    }
  }
  return hyperlinks;
}

function extractHyperlinkFormulaUrl(formula: string): string | null {
  const match = /HYPERLINK\s*\(\s*"([^"]+)"/i.exec(formula);
  return match?.[1]?.trim() || null;
}

function cellDisplayText(
  cellXml: string,
  sharedStrings: string[]
): { text: string; formulaUrl: string | null } {
  const type = /\bt="([^"]+)"/i.exec(cellXml)?.[1] || '';
  const formula = /<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/i.exec(cellXml)?.[1] || '';
  const formulaUrl = formula ? extractHyperlinkFormulaUrl(decodeXmlEntities(formula)) : null;
  const inlineStr = /<is\b[^>]*>([\s\S]*?)<\/is>/i.exec(cellXml)?.[1];
  if (inlineStr) {
    const texts: string[] = [];
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi;
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRe.exec(inlineStr))) {
      texts.push(decodeXmlEntities(tMatch[1]));
    }
    return { text: texts.join(''), formulaUrl };
  }

  const rawValue = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/i.exec(cellXml)?.[1];
  if (rawValue == null) {
    return { text: '', formulaUrl };
  }
  const decoded = decodeXmlEntities(rawValue);
  if (type === 's') {
    const index = Number(decoded);
    return {
      text: Number.isFinite(index) ? sharedStrings[index] ?? '' : '',
      formulaUrl,
    };
  }
  if (type === 'b') {
    return { text: decoded === '1' ? 'TRUE' : 'FALSE', formulaUrl };
  }
  return { text: decoded, formulaUrl };
}

function sheetXmlToRows(
  sheetXml: string,
  sharedStrings: string[],
  hyperlinks: Map<string, string>
): string[][] {
  const rows = new Map<number, Map<number, string>>();
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(sheetXml))) {
    const rowXml = rowMatch[1];
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowXml))) {
      const attrs = cellMatch[1] || cellMatch[3] || '';
      const body = cellMatch[2] || '';
      const ref = /\br="([^"]+)"/i.exec(attrs)?.[1];
      if (!ref) continue;
      const parsed = parseCellRef(ref);
      if (!parsed) continue;

      const { text, formulaUrl } = cellDisplayText(
        `<c ${attrs}>${body}</c>`,
        sharedStrings
      );
      const link =
        hyperlinks.get(ref.toUpperCase()) ||
        formulaUrl ||
        null;
      const value = cellValueToText(
        link ? { text, hyperlink: link } : text
      );

      if (!rows.has(parsed.row)) {
        rows.set(parsed.row, new Map());
      }
      rows.get(parsed.row)!.set(parsed.col, value);
    }
  }

  const sortedRowIndexes = [...rows.keys()].sort((a, b) => a - b);
  return sortedRowIndexes.map((rowIndex) => {
    const cols = rows.get(rowIndex)!;
    const maxCol = Math.max(...cols.keys(), -1);
    const line: string[] = [];
    for (let col = 0; col <= maxCol; col++) {
      line.push(cols.get(col) ?? '');
    }
    return line;
  });
}

function listWorksheetPaths(workbookXml: string): string[] {
  const paths: string[] = [];
  const sheetRe = /<sheet\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = sheetRe.exec(workbookXml))) {
    const attrs = match[0];
    const name = /\bname="([^"]+)"/i.exec(attrs)?.[1];
    // Prefer relationship-driven paths via workbook rels; fallback to sheet order below.
    if (name) {
      paths.push(name);
    }
  }
  return paths;
}

async function readZipText(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path) || zip.file(path.replace(/^\//, ''));
  if (!file) return null;
  return file.async('string');
}

/**
 * Convert an XLSX workbook buffer to tab-delimited text without Node stream
 * pipelines (ExcelJS `xlsx.load` uses PassThrough and can throw
 * `state.objectMode` under Bun).
 */
export async function workbookBytesToText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const workbookXml = await readZipText(zip, 'xl/workbook.xml');
  if (!workbookXml) {
    throw new Error('Invalid XLSX: missing workbook.xml');
  }

  const workbookRels = await readZipText(zip, 'xl/_rels/workbook.xml.rels');
  const sharedStringsXml = await readZipText(zip, 'xl/sharedStrings.xml');
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];

  const sheetTargets: { name: string; target: string }[] = [];
  if (workbookRels) {
    const sheetNameByRid = new Map<string, string>();
    const sheetTagRe = /<sheet\b([^>]*)\/?>/gi;
    let sheetTag: RegExpExecArray | null;
    while ((sheetTag = sheetTagRe.exec(workbookXml))) {
      const attrs = sheetTag[1];
      const name = /\bname="([^"]+)"/i.exec(attrs)?.[1];
      const rId =
        /\br:id="([^"]+)"/i.exec(attrs)?.[1] || /\bid="([^"]+)"/i.exec(attrs)?.[1];
      if (name && rId) sheetNameByRid.set(rId, decodeXmlEntities(name));
    }

    const relRe =
      /<Relationship\b[^>]*>/gi;
    let relMatch: RegExpExecArray | null;
    while ((relMatch = relRe.exec(workbookRels))) {
      const tag = relMatch[0];
      const type = /\bType="([^"]+)"/i.exec(tag)?.[1] || '';
      if (!type.includes('/worksheet')) continue;
      const id = /\bId="([^"]+)"/i.exec(tag)?.[1];
      const target = /\bTarget="([^"]+)"/i.exec(tag)?.[1];
      if (!id || !target) continue;
      const name = sheetNameByRid.get(id) || `Sheet${sheetTargets.length + 1}`;
      const normalized = target.replace(/^\//, '');
      const path = normalized.startsWith('xl/') ? normalized : `xl/${normalized}`;
      sheetTargets.push({ name, target: path });
    }
  }

  if (sheetTargets.length === 0) {
    // Fallback: first worksheets/*.xml in zip order
    const sheetNames = listWorksheetPaths(workbookXml);
    const worksheetFiles = Object.keys(zip.files)
      .filter((path) => /^xl\/worksheets\/[^/]+\.xml$/i.test(path))
      .sort();
    worksheetFiles.forEach((path, index) => {
      sheetTargets.push({
        name: sheetNames[index] || `Sheet${index + 1}`,
        target: path,
      });
    });
  }

  const lines: string[] = [];
  for (const sheet of sheetTargets) {
    const sheetXml = await readZipText(zip, sheet.target);
    if (!sheetXml) continue;

    const sheetFileName = sheet.target.split('/').pop() || 'sheet1.xml';
    const relsPath = `xl/worksheets/_rels/${sheetFileName}.rels`;
    const relsXml = await readZipText(zip, relsPath);
    const hyperlinks = parseHyperlinkTargets(sheetXml, relsXml);
    const rows = sheetXmlToRows(sheetXml, sharedStrings, hyperlinks);

    lines.push(`# Sheet: ${sheet.name}`);
    for (const row of rows) {
      lines.push(row.join('\t'));
    }
  }

  return lines.join('\n');
}
