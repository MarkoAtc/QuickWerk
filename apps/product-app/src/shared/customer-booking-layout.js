import { resolveResponsiveLayout } from './responsive-layout';

const customerBookingModes = Object.freeze({
  phone: Object.freeze({
    contentGutter: 16,
    sectionPadding: 16,
    cardPadding: 16,
    contentMaxWidth: 760,
    urgencyDirection: 'column',
    summaryRowDirection: 'column',
    editorActionDirection: 'column',
    paymentRowDirection: 'row',
    titleFontSize: 32,
    titleLineHeight: 38,
    bottomActionPadding: 16,
    minimumControlHeight: 44,
  }),
  compact: Object.freeze({
    contentGutter: 20,
    sectionPadding: 20,
    cardPadding: 20,
    contentMaxWidth: 760,
    urgencyDirection: 'row',
    summaryRowDirection: 'row',
    editorActionDirection: 'row',
    paymentRowDirection: 'row',
    titleFontSize: 36,
    titleLineHeight: 42,
    bottomActionPadding: 20,
    minimumControlHeight: 44,
  }),
  wide: Object.freeze({
    contentGutter: 24,
    sectionPadding: 24,
    cardPadding: 24,
    contentMaxWidth: 760,
    urgencyDirection: 'row',
    summaryRowDirection: 'row',
    editorActionDirection: 'row',
    paymentRowDirection: 'row',
    titleFontSize: 40,
    titleLineHeight: 46,
    bottomActionPadding: 24,
    minimumControlHeight: 44,
  }),
});

export function deriveCustomerBookingLayout(responsiveLayout) {
  const modeLayout = customerBookingModes[responsiveLayout.mode] ?? customerBookingModes.phone;

  return {
    ...responsiveLayout,
    ...modeLayout,
  };
}

export function resolveCustomerBookingLayout(inputWidth) {
  return deriveCustomerBookingLayout(resolveResponsiveLayout(inputWidth));
}

export function resolveCustomerBookingBottomPadding(layout, bottomInset) {
  const safeBottomInset = Number.isFinite(bottomInset) && bottomInset >= 0 ? bottomInset : 0;
  return Math.max(layout?.bottomActionPadding ?? customerBookingModes.phone.bottomActionPadding, safeBottomInset + 12);
}
