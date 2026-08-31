import { resolveResponsiveLayout } from './responsive-layout';

const providerLayouts = Object.freeze({
  phone: Object.freeze({
    contentGutter: 16,
    sectionPadding: 16,
    sectionRadius: 24,
    heroTitleFontSize: 36,
    heroTitleLineHeight: 40,
    sectionTitleFontSize: 24,
    sectionTitleLineHeight: 28,
    contentDirection: 'column',
    actionDirection: 'column',
    requestActionDirection: 'column',
    payoutSummaryDirection: 'column',
    profileIdentityDirection: 'column',
    profileAvatarSize: 64,
  }),
  compact: Object.freeze({
    contentGutter: 20,
    sectionPadding: 24,
    sectionRadius: 28,
    heroTitleFontSize: 44,
    heroTitleLineHeight: 48,
    sectionTitleFontSize: 26,
    sectionTitleLineHeight: 30,
    contentDirection: 'column',
    actionDirection: 'row',
    requestActionDirection: 'row',
    payoutSummaryDirection: 'row',
    profileIdentityDirection: 'row',
    profileAvatarSize: 72,
  }),
  wide: Object.freeze({
    contentGutter: 24,
    sectionPadding: 32,
    sectionRadius: 32,
    heroTitleFontSize: 48,
    heroTitleLineHeight: 52,
    sectionTitleFontSize: 28,
    sectionTitleLineHeight: 32,
    contentDirection: 'row',
    actionDirection: 'row',
    requestActionDirection: 'row',
    payoutSummaryDirection: 'row',
    profileIdentityDirection: 'row',
    profileAvatarSize: 76,
  }),
});

export function deriveProviderLayout(responsiveLayout) {
  return {
    ...responsiveLayout,
    ...(providerLayouts[responsiveLayout.mode] ?? providerLayouts.phone),
  };
}

export function resolveProviderLayout(inputWidth) {
  return deriveProviderLayout(resolveResponsiveLayout(inputWidth));
}
