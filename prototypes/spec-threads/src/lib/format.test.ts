import { describe, expect, it } from 'vitest';
import { parseTags, signed, positionTitle, timeAgo } from './format';

describe('positionTitle', () => {
  it('uses the first markdown heading, wherever it is', () => {
    expect(positionTitle('intro line\n\n### Two tiers: regulated **low-power**\n\n- a')).toBe('Two tiers: regulated low-power');
  });
  it('falls back to the first non-empty line, stripping list and emphasis marks', () => {
    expect(positionTitle('\n\n- `180 mm` legs\nmore')).toBe('180 mm legs');
  });
  it('truncates long titles with an ellipsis', () => {
    const t = positionTitle('# ' + 'x'.repeat(200), 20);
    expect(t).toHaveLength(20);
    expect(t.endsWith('…')).toBe(true);
  });
  it('never returns an empty string', () => {
    expect(positionTitle('')).toBe('Untitled position');
    expect(positionTitle('###   ')).toBe('Untitled position');
    expect(positionTitle('**')).toBe('Untitled position');
  });
});

describe('small formatters', () => {
  it('signed', () => {
    expect([signed(3), signed(0), signed(-2.5)]).toEqual(['+3', '0', '-2.5']);
  });
  it('parseTags dedupes, lowercases, drops blanks', () => {
    expect(parseTags(' PCB, pcb ,, Power ')).toEqual(['pcb', 'power']);
  });
  it('timeAgo', () => {
    const now = new Date('2026-09-18T12:00:00Z');
    expect(timeAgo('2026-09-18T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-09-18T11:15:00Z', now)).toBe('45 min ago');
    expect(timeAgo('2026-09-18T07:00:00Z', now)).toBe('5 h ago');
    expect(timeAgo('2026-09-15T12:00:00Z', now)).toBe('3 d ago');
    expect(timeAgo('2026-07-01T12:00:00Z', now)).toBe('2026-07-01');
  });
});
