import { resolveResponsiveLayout } from './responsive-layout';

const messengerModes = Object.freeze({
  phone: Object.freeze({
    contentGutter: 16,
    contentMaxWidth: 760,
    cardPadding: 16,
    heroFontSize: 32,
    heroLineHeight: 38,
    bubbleMaxWidth: '88%',
    composerMinHeight: 48,
    composerPadding: 16,
    minimumControlHeight: 44,
  }),
  compact: Object.freeze({
    contentGutter: 20,
    contentMaxWidth: 760,
    cardPadding: 20,
    heroFontSize: 36,
    heroLineHeight: 42,
    bubbleMaxWidth: '84%',
    composerMinHeight: 52,
    composerPadding: 20,
    minimumControlHeight: 44,
  }),
  wide: Object.freeze({
    contentGutter: 24,
    contentMaxWidth: 760,
    cardPadding: 24,
    heroFontSize: 40,
    heroLineHeight: 46,
    bubbleMaxWidth: '82%',
    composerMinHeight: 56,
    composerPadding: 24,
    minimumControlHeight: 44,
  }),
});

export function deriveMessengerLayout(responsiveLayout) {
  const modeLayout = messengerModes[responsiveLayout.mode] ?? messengerModes.phone;
  return { ...responsiveLayout, ...modeLayout };
}

export function resolveMessengerLayout(inputWidth) {
  return deriveMessengerLayout(resolveResponsiveLayout(inputWidth));
}
