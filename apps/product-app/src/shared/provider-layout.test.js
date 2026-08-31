import { describe, expect, it } from 'vitest';

import { resolveProviderLayout } from './provider-layout';

describe('resolveProviderLayout', () => {
  it.each([320, 360, 390, 430])('uses a phone-safe provider composition at %ipx', (width) => {
    expect(resolveProviderLayout(width)).toMatchObject({
      mode: 'phone',
      contentGutter: 16,
      sectionPadding: 16,
      heroTitleFontSize: 36,
      contentDirection: 'column',
      actionDirection: 'column',
      profileIdentityDirection: 'column',
    });
  });

  it('retains the intentional wide provider composition', () => {
    expect(resolveProviderLayout(1024)).toMatchObject({
      mode: 'wide',
      contentGutter: 24,
      sectionPadding: 32,
      contentDirection: 'row',
      actionDirection: 'row',
      profileIdentityDirection: 'row',
    });
  });

  it('fails closed to the phone-safe composition for invalid widths', () => {
    expect(resolveProviderLayout(Number.NaN)).toMatchObject({
      mode: 'phone',
      contentDirection: 'column',
      actionDirection: 'column',
    });
  });
});
