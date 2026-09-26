import { HSL_COLOR_PATTERN } from './constants/avatar-hsl-color-pattern.constant';

export function generateAvatarColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 40) + 60;
  const l = Math.floor(Math.random() * 20) + 35;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function isAvatarColor(value: string): boolean {
  return HSL_COLOR_PATTERN.test(value);
}
