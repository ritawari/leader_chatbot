import {
  deadlineColor,
  numberColor,
  toneColor,
  getBubbleColor,
  wcagTextColor,
} from "./colors";

// ---------------------------------------------------------------------------
// Requirement: Blue (>=24h) → Yellow (12h) → Deep Orange (<2h)
// ---------------------------------------------------------------------------
describe("deadlineColor", () => {
  test("v=0.0 returns blue (#1d4ed8) — >=24h", () => {
    expect(deadlineColor(0.0)).toBe("#1d4ed8");
  });

  test("v=0.5 returns yellow (#eab308) — 12h midpoint", () => {
    expect(deadlineColor(0.5)).toBe("#eab308");
  });

  test("v=1.0 returns deep orange (#ea580c) — <2h", () => {
    expect(deadlineColor(1.0)).toBe("#ea580c");
  });

  test("v=0.25 interpolates between blue and yellow", () => {
    const hex = deadlineColor(0.25);
    // r channel should be between 0x1d (29) and 0xea (234)
    const r = parseInt(hex.slice(1, 3), 16);
    expect(r).toBeGreaterThan(29);
    expect(r).toBeLessThan(234);
  });

  test("v=0.75 interpolates between yellow and deep orange", () => {
    const hex = deadlineColor(0.75);
    const r = parseInt(hex.slice(1, 3), 16);
    // red channel stays high in yellow-to-orange range
    expect(r).toBeGreaterThanOrEqual(0xea);
  });

  test("clamps value below 0 to blue", () => {
    expect(deadlineColor(-1)).toBe(deadlineColor(0));
  });

  test("clamps value above 1 to deep orange", () => {
    expect(deadlineColor(2)).toBe(deadlineColor(1));
  });

  test("returns a valid 7-char hex string for all values", () => {
    [0, 0.1, 0.25, 0.5, 0.75, 1].forEach((v) => {
      expect(deadlineColor(v)).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

// ---------------------------------------------------------------------------
// Requirement: White (00) → Grey (50) → Black (100) based on last 2 digits
// ---------------------------------------------------------------------------
describe("numberColor", () => {
  test("v=0.0 returns white (#ffffff) — last 2 digits = 00", () => {
    expect(numberColor(0.0)).toBe("#ffffff");
  });

  test("v=0.5 returns grey (#6b7280) — last 2 digits = 50", () => {
    expect(numberColor(0.5)).toBe("#6b7280");
  });

  test("v=1.0 returns black (#000000) — value = 100", () => {
    expect(numberColor(1.0)).toBe("#000000");
  });

  test("v=0.25 interpolates between white and grey", () => {
    const hex = numberColor(0.25);
    const r = parseInt(hex.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0x6b);
    expect(r).toBeLessThan(0xff);
  });

  test("v=0.75 interpolates between grey and black", () => {
    const hex = numberColor(0.75);
    const r = parseInt(hex.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0x00);
    expect(r).toBeLessThan(0x6b);
  });

  test("clamps below 0 to white", () => {
    expect(numberColor(-0.5)).toBe(numberColor(0));
  });

  test("clamps above 1 to black", () => {
    expect(numberColor(1.5)).toBe(numberColor(1));
  });

  // Verify the last-2-digit math used in the server maps correctly
  test("9900 % 100 / 100 = 0.0 → white (last digits 00)", () => {
    expect(numberColor((9900 % 100) / 100)).toBe("#ffffff");
  });

  test("1950 % 100 / 100 = 0.5 → grey (last digits 50)", () => {
    expect(numberColor((1950 % 100) / 100)).toBe("#6b7280");
  });

  test("7575 % 100 / 100 = 0.75 → dark grey (last digits 75)", () => {
    const hex = numberColor((7575 % 100) / 100);
    const r = parseInt(hex.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(0x6b);
  });
});

// ---------------------------------------------------------------------------
// Requirement: Very sad = very red; Neutral = white; Very happy = very green
// ---------------------------------------------------------------------------
describe("toneColor", () => {
  test("v=0.0 returns red (#dc2626) — very sad", () => {
    expect(toneColor(0.0)).toBe("#dc2626");
  });

  test("v=0.5 returns white (#ffffff) — neutral", () => {
    expect(toneColor(0.5)).toBe("#ffffff");
  });

  test("v=1.0 returns green (#16a34a) — very happy", () => {
    expect(toneColor(1.0)).toBe("#16a34a");
  });

  test("v=0.25 interpolates between red and white (light red)", () => {
    const hex = toneColor(0.25);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    // should be pinkish — high red, elevated green
    expect(r).toBeGreaterThan(0xdc);
    expect(g).toBeGreaterThan(0x26);
  });

  test("v=0.75 interpolates between white and green (light green)", () => {
    const hex = toneColor(0.75);
    const g = parseInt(hex.slice(3, 5), 16);
    expect(g).toBeGreaterThan(0xa3);
  });

  test("clamps below 0 to red", () => {
    expect(toneColor(-1)).toBe(toneColor(0));
  });

  test("clamps above 1 to green", () => {
    expect(toneColor(2)).toBe(toneColor(1));
  });
});

// ---------------------------------------------------------------------------
// getBubbleColor — requirement: route correct color function per type
// ---------------------------------------------------------------------------
describe("getBubbleColor", () => {
  test("type=deadline delegates to deadlineColor", () => {
    expect(getBubbleColor("deadline", 0)).toBe(deadlineColor(0));
    expect(getBubbleColor("deadline", 0.5)).toBe(deadlineColor(0.5));
    expect(getBubbleColor("deadline", 1)).toBe(deadlineColor(1));
  });

  test("type=number delegates to numberColor", () => {
    expect(getBubbleColor("number", 0)).toBe(numberColor(0));
    expect(getBubbleColor("number", 0.5)).toBe(numberColor(0.5));
    expect(getBubbleColor("number", 1)).toBe(numberColor(1));
  });

  test("type=tone delegates to toneColor", () => {
    expect(getBubbleColor("tone", 0)).toBe(toneColor(0));
    expect(getBubbleColor("tone", 0.5)).toBe(toneColor(0.5));
    expect(getBubbleColor("tone", 1)).toBe(toneColor(1));
  });
});

// ---------------------------------------------------------------------------
// WCAG 2.0 — wcagTextColor must return the higher-contrast option
// ---------------------------------------------------------------------------
describe("wcagTextColor", () => {
  test("black background → white text", () => {
    expect(wcagTextColor("#000000")).toBe("#ffffff");
  });

  test("white background → black text", () => {
    expect(wcagTextColor("#ffffff")).toBe("#000000");
  });

  test("deep blue deadline (#1d4ed8) → white text (contrast ~6.7:1)", () => {
    expect(wcagTextColor("#1d4ed8")).toBe("#ffffff");
  });

  test("yellow deadline (#eab308) → black text (contrast ~10.9:1)", () => {
    expect(wcagTextColor("#eab308")).toBe("#000000");
  });

  test("deep orange (#ea580c) → black text (L≈0.245, contrast black=5.9 > white=3.6)", () => {
    expect(wcagTextColor("#ea580c")).toBe("#000000");
  });

  test("grey number midpoint (#6b7280) → white text", () => {
    expect(wcagTextColor("#6b7280")).toBe("#ffffff");
  });

  test("red tone (#dc2626) → white text", () => {
    expect(wcagTextColor("#dc2626")).toBe("#ffffff");
  });

  test("green tone (#16a34a) → black text (L≈0.268, contrast black=6.4 > white=3.3)", () => {
    expect(wcagTextColor("#16a34a")).toBe("#000000");
  });

  test("neutral tone white (#ffffff) → black text", () => {
    expect(wcagTextColor("#ffffff")).toBe("#000000");
  });

  // WCAG compliance sweep — every bubble across all three scales must
  // produce a text color that yields >= 4.5:1 contrast ratio
  test("WCAG AA compliance sweep — deadline scale all 21 steps", () => {
    for (let i = 0; i <= 20; i++) {
      const v = i / 20;
      const bg = deadlineColor(v);
      const text = wcagTextColor(bg);
      expect(text).toMatch(/^#(000000|ffffff)$/);
      expect(contrastRatio(bg, text)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("WCAG AA compliance sweep — number scale all 21 steps", () => {
    for (let i = 0; i <= 20; i++) {
      const v = i / 20;
      const bg = numberColor(v);
      const text = wcagTextColor(bg);
      expect(text).toMatch(/^#(000000|ffffff)$/);
      expect(contrastRatio(bg, text)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("WCAG AA compliance sweep — tone scale all 21 steps", () => {
    for (let i = 0; i <= 20; i++) {
      const v = i / 20;
      const bg = toneColor(v);
      const text = wcagTextColor(bg);
      expect(text).toMatch(/^#(000000|ffffff)$/);
      expect(contrastRatio(bg, text)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// ---------------------------------------------------------------------------
// Helper — computes WCAG contrast ratio between two hex colours
// ---------------------------------------------------------------------------
function luminance(hex: string): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(hex.slice(1, 3), 16));
  const g = toLinear(parseInt(hex.slice(3, 5), 16));
  const b = toLinear(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
