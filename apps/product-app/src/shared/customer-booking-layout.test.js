import { describe, expect, it } from 'vitest';

import {
  resolveCustomerBookingBottomPadding,
  resolveCustomerBookingLayout,
} from './customer-booking-layout';

describe('resolveCustomerBookingLayout', () => {
  it.each([320, 360, 390, 430])('uses phone-safe booking composition at %ipx', (width) => {
    expect(resolveCustomerBookingLayout(width)).toMatchObject({
      mode: 'phone',
      width,
      contentGutter: 16,
      cardPadding: 16,
      urgencyDirection: 'column',
      summaryRowDirection: 'column',
      editorActionDirection: 'column',
      paymentRowDirection: 'row',
    });
  });

  it('uses compact composition without phone-only stacking', () => {
    expect(resolveCustomerBookingLayout(600)).toMatchObject({
      mode: 'compact',
      contentGutter: 20,
      cardPadding: 20,
      urgencyDirection: 'row',
      summaryRowDirection: 'row',
      editorActionDirection: 'row',
      paymentRowDirection: 'row',
    });
  });

  it('preserves an intentional bounded wide presentation', () => {
    expect(resolveCustomerBookingLayout(1024)).toMatchObject({
      mode: 'wide',
      contentGutter: 24,
      cardPadding: 24,
      contentMaxWidth: 760,
      urgencyDirection: 'row',
      summaryRowDirection: 'row',
      editorActionDirection: 'row',
      paymentRowDirection: 'row',
    });
  });

  it.each([undefined, null, Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'fails closed to the phone-safe policy for invalid width %s',
    (width) => {
      expect(resolveCustomerBookingLayout(width)).toMatchObject({
        mode: 'phone',
        width: 320,
        contentGutter: 16,
        urgencyDirection: 'column',
        summaryRowDirection: 'column',
        editorActionDirection: 'column',
      });
    },
  );

  it('keeps the 320px content column and controls within the viewport', () => {
    const layout = resolveCustomerBookingLayout(320);

    expect(layout.width - layout.contentGutter * 2).toBeGreaterThanOrEqual(288);
    expect(layout.minimumControlHeight).toBeGreaterThanOrEqual(44);
    expect(layout.contentMaxWidth).toBeGreaterThan(layout.width - layout.contentGutter * 2);
  });
});

describe('resolveCustomerBookingBottomPadding', () => {
  it('keeps a useful baseline without a safe-area inset', () => {
    expect(resolveCustomerBookingBottomPadding(resolveCustomerBookingLayout(320), 0)).toBe(16);
  });

  it('adds breathing room above a device safe area', () => {
    expect(resolveCustomerBookingBottomPadding(resolveCustomerBookingLayout(390), 34)).toBe(46);
  });

  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'ignores invalid safe-area inset %s',
    (bottomInset) => {
      expect(resolveCustomerBookingBottomPadding(resolveCustomerBookingLayout(320), bottomInset)).toBe(16);
    },
  );
});
