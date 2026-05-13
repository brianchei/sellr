import { describe, expect, it } from 'vitest';
import { formatRadius } from './listing-format';

describe('formatRadius', () => {
  it('formats approximate pickup radius in miles', () => {
    expect(formatRadius(500)).toBe('0.3 mi');
    expect(formatRadius(1000)).toBe('0.6 mi');
    expect(formatRadius(2500)).toBe('1.6 mi');
    expect(formatRadius(5000)).toBe('3.1 mi');
  });
});
