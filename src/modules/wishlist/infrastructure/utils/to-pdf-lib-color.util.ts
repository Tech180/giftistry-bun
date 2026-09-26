import { rgb } from 'pdf-lib';

export function toPdfLibColor(c: { red: number; green: number; blue: number }) {
  return rgb(c.red, c.green, c.blue);
}
