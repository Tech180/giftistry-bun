import { load } from 'cheerio';

const DEFAULT_MAX_BYTES = 80 * 1024;

const KEEP_SCRIPT_TYPES = new Set(['application/ld+json', 'application/json']);

function isEssentialScript(
  typeAttr: string | undefined,
  idAttr: string | undefined,
  innerLength: number
): boolean {
  const type = typeAttr?.trim().toLowerCase() ?? '';
  if (KEEP_SCRIPT_TYPES.has(type)) {
    return true;
  }
  if (idAttr === '__NEXT_DATA__') {
    return true;
  }
  if (!type && innerLength > 0 && innerLength <= 16_384) {
    return true;
  }
  return false;
}

function stripDataUrls(html: string): string {
  return html.replace(/data:[^"'\\s>]+/gi, 'data:stripped');
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * Shrinks third-party HTML fixtures for the scraping corpus: preserves structured
 * product scripts (JSON-LD, application/json, __NEXT_DATA__, small inline bootstraps),
 * drops stylesheets, SVG, and base64 blobs, targeting <= maxBytes UTF-8.
 */
export function trimFixtureHtml(html: string, maxBytes = DEFAULT_MAX_BYTES): string {
  const $ = load(html, { decodeEntities: false });

  $('style, link[rel="stylesheet"]').remove();
  $('svg').remove();
  $('noscript').remove();

  $('script').each((_, el) => {
    const node = $(el);
    const type = node.attr('type');
    const id = node.attr('id');
    const inner = node.html() ?? '';
    if (!isEssentialScript(type, id, inner.length)) {
      node.remove();
    }
  });

  $('*').each((_, el) => {
    const node = $(el);
    for (const attr of Object.keys(el.attrib ?? {})) {
      const value = node.attr(attr);
      if (value && /data:/i.test(value)) {
        node.attr(attr, 'data:stripped');
      }
    }
    if (node.attr('style')) {
      node.removeAttr('style');
    }
  });

  let out = stripDataUrls($.html());
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/\s{2,}/g, ' ');

  if (byteLength(out) <= maxBytes) {
    return out;
  }

  $('body *').each((_, el) => {
    if (byteLength(out) <= maxBytes) {
      return false;
    }
    const node = $(el);
    if (node.is('script')) {
      return;
    }
    const textLen = node.text().length;
    if (textLen > 200) {
      node.remove();
      out = stripDataUrls($.html());
    }
  });

  if (byteLength(out) > maxBytes) {
    const truncated = Buffer.from(out, 'utf8').subarray(0, maxBytes).toString('utf8');
    out = `${truncated}\n<!-- trim-fixture-html: truncated -->`;
  }

  return out;
}
