import { describe, expect, it } from 'vitest';

import { resolveMessengerLayout } from './messenger-layout';

describe('resolveMessengerLayout', () => {
  it('uses phone-safe spacing, text, bubbles, and controls at supported phone widths', () => {
    for (const width of [320, 360, 390, 430]) {
      expect(resolveMessengerLayout(width)).toMatchObject({
        mode: 'phone',
        contentGutter: 16,
        heroFontSize: 32,
        bubbleMaxWidth: '88%',
        minimumControlHeight: 44,
      });
    }
  });

  it('keeps intentional compact and wide compositions', () => {
    expect(resolveMessengerLayout(600)).toMatchObject({ mode: 'compact', contentGutter: 20, bubbleMaxWidth: '84%' });
    expect(resolveMessengerLayout(1024)).toMatchObject({ mode: 'wide', contentGutter: 24, heroFontSize: 40, bubbleMaxWidth: '82%' });
  });

  it('fails closed to phone-safe values for invalid widths', () => {
    for (const width of [undefined, NaN, 0, -1]) {
      expect(resolveMessengerLayout(width)).toMatchObject({ mode: 'phone', contentGutter: 16, bubbleMaxWidth: '88%' });
    }
  });
});
