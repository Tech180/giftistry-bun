import { rgb } from 'pdf-lib';

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

export function parseHslToRgbColor(hslStr: string) {
  const match = hslStr.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
  if (match && match[1] !== undefined && match[2] !== undefined && match[3] !== undefined) {
    const h = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    const l = parseInt(match[3], 10);
    const [r, g, b] = hslToRgb(h, s, l);
    return rgb(r, g, b);
  }
  return rgb(0.37, 0.42, 0.82);
}
