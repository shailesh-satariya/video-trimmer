import { describe, expect, it } from 'vitest';

import { formatTime } from './time';

describe('formatTime', () => {
  it('formats a sub-hour timestamp', () => {
    expect(formatTime(65.4329)).toBe('01:05.432');
  });

  it('includes hours when needed', () => {
    expect(formatTime(3_661.007)).toBe('01:01:01.007');
  });

  it('returns zero for invalid input', () => {
    expect(formatTime(Number.NaN)).toBe('00:00.000');
    expect(formatTime(-1)).toBe('00:00.000');
  });
});
