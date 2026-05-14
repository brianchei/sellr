import { describe, expect, it } from 'vitest';
import {
  formatAvailabilityWindow,
  formatPickupHour,
  formatRadius,
} from './listing-format';

describe('formatRadius', () => {
  it('formats approximate pickup radius in miles', () => {
    expect(formatRadius(500)).toBe('0.3 mi');
    expect(formatRadius(1000)).toBe('0.6 mi');
    expect(formatRadius(2500)).toBe('1.6 mi');
    expect(formatRadius(5000)).toBe('3.1 mi');
  });
});

describe('formatAvailabilityWindow', () => {
  it('formats pickup hours without leading zeroes', () => {
    expect(formatPickupHour(0)).toBe('12 AM');
    expect(formatPickupHour(12)).toBe('12 PM');
    expect(formatPickupHour(17)).toBe('5 PM');
  });

  it('formats weekly pickup windows with buyer-friendly times', () => {
    expect(
      formatAvailabilityWindow({
        dayOfWeek: 6,
        startHour: 10,
        endHour: 14,
      }),
    ).toBe('Saturday, 10 AM-2 PM');
  });

  it('uses a specific date when one is present', () => {
    expect(
      formatAvailabilityWindow({
        specificDate: '2026-05-16T12:00:00.000Z',
        dayOfWeek: 0,
        startHour: 9,
        endHour: 12,
      }),
    ).toBe('May 16, 9 AM-12 PM');
  });
});
