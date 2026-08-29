import { describe, expect, it } from 'vitest';

import { resolveCustomerDiscoveryLayout } from './customer-discovery-layout';

describe('resolveCustomerDiscoveryLayout', () => {
  it.each([320, 360, 390, 430])('uses phone-safe discovery composition at %ipx', (width) => {
    expect(resolveCustomerDiscoveryLayout(width)).toMatchObject({
      mode: 'phone',
      width,
      contentGutter: 16,
      sectionPadding: 16,
      heroTitleFontSize: 36,
      heroTitleLineHeight: 40,
      sectionTitleFontSize: 24,
      sectionTitleLineHeight: 28,
      categoryColumnCount: 1,
      categoryTileWidth: '100%',
      heroStatsDirection: 'column',
      providerCardDirection: 'column',
      providerCardFooterDirection: 'column',
      providerDetailIdentityDirection: 'column',
      providerAvatarSize: 56,
    });
  });

  it('uses a compact two-column grid without desktop display sizing', () => {
    expect(resolveCustomerDiscoveryLayout(600)).toMatchObject({
      mode: 'compact',
      contentGutter: 20,
      sectionPadding: 24,
      heroTitleFontSize: 48,
      heroTitleLineHeight: 52,
      sectionTitleFontSize: 26,
      sectionTitleLineHeight: 30,
      categoryColumnCount: 2,
      categoryTileWidth: '48.8%',
      heroStatsDirection: 'row',
      providerCardDirection: 'row',
      providerCardFooterDirection: 'row',
      providerDetailIdentityDirection: 'row',
      providerAvatarSize: 64,
    });
  });

  it('preserves an intentional wide presentation', () => {
    expect(resolveCustomerDiscoveryLayout(1024)).toMatchObject({
      mode: 'wide',
      contentGutter: 24,
      sectionPadding: 32,
      heroTitleFontSize: 54,
      heroTitleLineHeight: 58,
      sectionTitleFontSize: 28,
      sectionTitleLineHeight: 32,
      categoryColumnCount: 2,
      categoryTileWidth: '48.8%',
      heroStatsDirection: 'row',
      providerCardDirection: 'row',
      providerCardFooterDirection: 'row',
      providerDetailIdentityDirection: 'row',
      providerAvatarSize: 72,
    });
  });

  it.each([undefined, null, Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'fails closed to the phone-safe policy for invalid width %s',
    (width) => {
      expect(resolveCustomerDiscoveryLayout(width)).toMatchObject({
        mode: 'phone',
        width: 320,
        categoryColumnCount: 1,
        heroStatsDirection: 'column',
        providerCardDirection: 'column',
        providerDetailIdentityDirection: 'column',
      });
    },
  );

  it('keeps phone cards and horizontal rails inside the 320px content width', () => {
    const layout = resolveCustomerDiscoveryLayout(320);
    const availableWidth = layout.width - layout.contentGutter * 2;

    expect(layout.matchCardWidth).toBeLessThanOrEqual(availableWidth);
    expect(layout.mapMarkerLabelMaxWidth).toBeLessThan(availableWidth);
  });
});
