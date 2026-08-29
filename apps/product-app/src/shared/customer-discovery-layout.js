import { resolveResponsiveLayout } from './responsive-layout';

const customerDiscoveryModes = Object.freeze({
  phone: Object.freeze({
    contentGutter: 16,
    sectionPadding: 16,
    sectionRadius: 24,
    heroTitleFontSize: 36,
    heroTitleLineHeight: 40,
    sectionTitleFontSize: 24,
    sectionTitleLineHeight: 28,
    providerNameFontSize: 24,
    providerNameLineHeight: 28,
    providerDetailTitleFontSize: 32,
    providerDetailTitleLineHeight: 36,
    categoryColumnCount: 1,
    categoryTileWidth: '100%',
    heroStatsDirection: 'column',
    providerCardDirection: 'column',
    providerCardFooterDirection: 'column',
    providerDetailIdentityDirection: 'column',
    providerAvatarSize: 56,
    providerCardGap: 16,
    mapMarkerLabelMaxWidth: 112,
    matchCardMaxWidth: 280,
  }),
  compact: Object.freeze({
    contentGutter: 20,
    sectionPadding: 24,
    sectionRadius: 28,
    heroTitleFontSize: 48,
    heroTitleLineHeight: 52,
    sectionTitleFontSize: 26,
    sectionTitleLineHeight: 30,
    providerNameFontSize: 28,
    providerNameLineHeight: 32,
    providerDetailTitleFontSize: 38,
    providerDetailTitleLineHeight: 42,
    categoryColumnCount: 2,
    categoryTileWidth: '48.8%',
    heroStatsDirection: 'row',
    providerCardDirection: 'row',
    providerCardFooterDirection: 'row',
    providerDetailIdentityDirection: 'row',
    providerAvatarSize: 64,
    providerCardGap: 20,
    mapMarkerLabelMaxWidth: 144,
    matchCardMaxWidth: 280,
  }),
  wide: Object.freeze({
    contentGutter: 24,
    sectionPadding: 32,
    sectionRadius: 32,
    heroTitleFontSize: 54,
    heroTitleLineHeight: 58,
    sectionTitleFontSize: 28,
    sectionTitleLineHeight: 32,
    providerNameFontSize: 30,
    providerNameLineHeight: 34,
    providerDetailTitleFontSize: 42,
    providerDetailTitleLineHeight: 46,
    categoryColumnCount: 2,
    categoryTileWidth: '48.8%',
    heroStatsDirection: 'row',
    providerCardDirection: 'row',
    providerCardFooterDirection: 'row',
    providerDetailIdentityDirection: 'row',
    providerAvatarSize: 72,
    providerCardGap: 24,
    mapMarkerLabelMaxWidth: 180,
    matchCardMaxWidth: 300,
  }),
});

export function deriveCustomerDiscoveryLayout(responsiveLayout) {
  const modeLayout = customerDiscoveryModes[responsiveLayout.mode] ?? customerDiscoveryModes.phone;
  const availableWidth = Math.max(0, responsiveLayout.width - modeLayout.contentGutter * 2);

  return {
    ...responsiveLayout,
    ...modeLayout,
    matchCardWidth: Math.min(modeLayout.matchCardMaxWidth, availableWidth),
  };
}

export function resolveCustomerDiscoveryLayout(inputWidth) {
  return deriveCustomerDiscoveryLayout(resolveResponsiveLayout(inputWidth));
}
