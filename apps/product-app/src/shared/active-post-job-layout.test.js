import { describe, expect, it } from 'vitest';

import { resolveActivePostJobLayout } from './active-post-job-layout';

describe('resolveActivePostJobLayout', () => {
  it('uses phone-safe spacing and stacked content at supported phone widths', () => {
    for (const width of [320, 360, 390, 430]) {
      expect(resolveActivePostJobLayout(width)).toMatchObject({
        mode: 'phone',
        contentGutter: 16,
        contentMaxWidth: 760,
        heroFontSize: 32,
        summaryDirection: 'column',
        trackingDirection: 'column',
        minimumControlHeight: 44,
      });
    }
  });

  it('keeps intentional compact and wide layouts', () => {
    expect(resolveActivePostJobLayout(600)).toMatchObject({
      mode: 'compact',
      summaryDirection: 'row',
      trackingDirection: 'row',
    });
    expect(resolveActivePostJobLayout(1024)).toMatchObject({
      mode: 'wide',
      contentGutter: 24,
      heroFontSize: 40,
      summaryDirection: 'row',
    });
  });

  it('fails closed to phone-safe values for invalid widths', () => {
    for (const width of [undefined, NaN, 0, -1]) {
      expect(resolveActivePostJobLayout(width)).toMatchObject({ mode: 'phone', summaryDirection: 'column' });
    }
  });
});
