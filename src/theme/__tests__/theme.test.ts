import { palettes, resolveScheme } from '..';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('resolveScheme', () => {
  it('follows the phone when set to system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
  });

  it('uses an explicit choice', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});

describe.each(['light', 'dark'] as const)('%s palette contrast', (scheme) => {
  const p = palettes[scheme];

  it('body text meets WCAG AAA (7:1)', () => {
    expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.text, p.surface)).toBeGreaterThanOrEqual(7);
  });

  it('muted text and coloured text meet WCAG AA (4.5:1)', () => {
    for (const color of [p.textMuted, p.primary, p.danger, p.success, p.warning]) {
      expect(contrast(color, p.background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(p.textMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('button labels meet WCAG AA', () => {
    expect(contrast(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.onDanger, p.danger)).toBeGreaterThanOrEqual(4.5);
  });
});
