import { describe, expect, it } from 'vitest';
import { resolveSignInLayout } from './sign-in-layout';

describe('resolveSignInLayout', () => {
  it('uses a stacked phone-safe composition at supported phone widths', () => {
    for (const width of [320, 360, 390, 430]) {
      expect(resolveSignInLayout(width)).toMatchObject({ mode: 'phone', gutter: 16, roleDirection: 'column', controlHeight: 44 });
    }
  });

  it('keeps rows for compact and wide layouts', () => {
    expect(resolveSignInLayout(600)).toMatchObject({ mode: 'compact', roleDirection: 'row' });
    expect(resolveSignInLayout(1024)).toMatchObject({ mode: 'wide', gutter: 24, roleDirection: 'row' });
  });

  it('fails closed to the phone layout', () => {
    expect(resolveSignInLayout(undefined)).toMatchObject({ mode: 'phone', roleDirection: 'column' });
  });
});
