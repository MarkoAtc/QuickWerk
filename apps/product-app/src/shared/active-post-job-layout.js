import { resolveResponsiveLayout } from './responsive-layout';

const activePostJobModes = Object.freeze({
  phone: Object.freeze({
    contentGutter: 16,
    contentMaxWidth: 760,
    heroFontSize: 32,
    heroLineHeight: 38,
    cardPadding: 16,
    mapMinHeight: 280,
    summaryDirection: 'column',
    trackingDirection: 'column',
    minimumControlHeight: 44,
  }),
  compact: Object.freeze({
    contentGutter: 20,
    contentMaxWidth: 760,
    heroFontSize: 36,
    heroLineHeight: 42,
    cardPadding: 20,
    mapMinHeight: 280,
    summaryDirection: 'row',
    trackingDirection: 'row',
    minimumControlHeight: 44,
  }),
  wide: Object.freeze({
    contentGutter: 24,
    contentMaxWidth: 760,
    heroFontSize: 40,
    heroLineHeight: 46,
    cardPadding: 24,
    mapMinHeight: 300,
    summaryDirection: 'row',
    trackingDirection: 'row',
    minimumControlHeight: 44,
  }),
});

export function deriveActivePostJobLayout(responsiveLayout) {
  const modeLayout = activePostJobModes[responsiveLayout.mode] ?? activePostJobModes.phone;
  return { ...responsiveLayout, ...modeLayout };
}

export function resolveActivePostJobLayout(inputWidth) {
  return deriveActivePostJobLayout(resolveResponsiveLayout(inputWidth));
}
