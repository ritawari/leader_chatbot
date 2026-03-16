import { MessageType } from "./types";

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function interpolate(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function threeStop(c1: string, c2: string, c3: string, v: number): string {
  const t = Math.max(0, Math.min(1, v));
  if (t <= 0.5) return interpolate(c1, c2, t * 2);
  return interpolate(c2, c3, (t - 0.5) * 2);
}

export function deadlineColor(v: number): string {
  return threeStop("#1d4ed8", "#eab308", "#ea580c", v);
}

export function numberColor(v: number): string {
  return threeStop("#ffffff", "#6b7280", "#000000", v);
}

export function toneColor(v: number): string {
  return threeStop("#dc2626", "#ffffff", "#16a34a", v);
}

export function getBubbleColor(type: MessageType, colorValue: number): string {
  if (type === "deadline") return deadlineColor(colorValue);
  if (type === "number") return numberColor(colorValue);
  return toneColor(colorValue);
}

function sRGBToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * sRGBToLinear(r) +
    0.7152 * sRGBToLinear(g) +
    0.0722 * sRGBToLinear(b)
  );
}

export function wcagTextColor(bgHex: string): string {
  const L = relativeLuminance(bgHex);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? "#ffffff" : "#000000";
}
