import { describe, expect, it } from 'vitest';

import { computeBookingPrice, PRICING_TABLE_VERSION } from './pricing-table';

const CATEGORIES = [
  'emergency',
  'plumbing',
  'electrical',
  'carpenter',
  'locksmith',
  'painting',
  'cleaning',
  'handyman',
];

describe('computeBookingPrice', () => {
  it.each(CATEGORIES)('returns a correctly-summed breakdown for %s / scheduled', (category) => {
    const result = computeBookingPrice(category, 'scheduled');

    expect(result.totalCents).toBe(result.calloutFeeCents + result.laborCents + result.platformFeeCents);
    expect(result.totalCents).toBeGreaterThan(0);
    expect(result.pricingTableVersion).toBe(PRICING_TABLE_VERSION);
    expect(result.lineItems.reduce((sum, item) => sum + item.amountCents, 0)).toBe(result.totalCents);
  });

  it.each(CATEGORIES)('urgent produces a strictly higher total than scheduled for %s', (category) => {
    const scheduled = computeBookingPrice(category, 'scheduled');
    const urgent = computeBookingPrice(category, 'urgent');

    expect(urgent.totalCents).toBeGreaterThan(scheduled.totalCents);
  });

  it('matches design/payment_checkout exactly for the reference combination (plumbing, scheduled)', () => {
    const result = computeBookingPrice('plumbing', 'scheduled');

    expect(result.calloutFeeCents).toBe(4500);
    expect(result.laborCents).toBe(17000);
    expect(result.platformFeeCents).toBe(1250);
    expect(result.totalCents).toBe(22750);
  });

  it('falls back to the default rate for a null/undefined category (legacy bookings)', () => {
    const nullResult = computeBookingPrice(null, null);
    const undefinedResult = computeBookingPrice(undefined, undefined);

    expect(nullResult.totalCents).toBeGreaterThan(0);
    expect(nullResult).toEqual(undefinedResult);
  });

  it('falls back to the default rate for an unrecognized category, without throwing', () => {
    expect(() => computeBookingPrice('some-future-category', 'urgent')).not.toThrow();
    const result = computeBookingPrice('some-future-category', 'scheduled');
    const fallback = computeBookingPrice(null, 'scheduled');

    expect(result).toEqual(fallback);
  });

  it('falls back to the base rate for an unrecognized urgency value, without throwing', () => {
    expect(() => computeBookingPrice('plumbing', 'some-future-urgency')).not.toThrow();
    const result = computeBookingPrice('plumbing', 'some-future-urgency');
    const base = computeBookingPrice('plumbing', 'scheduled');

    expect(result).toEqual(base);
  });

  it('is deterministic for the same inputs', () => {
    const first = computeBookingPrice('electrical', 'urgent');
    const second = computeBookingPrice('electrical', 'urgent');

    expect(first).toEqual(second);
  });
});
