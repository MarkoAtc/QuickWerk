export const responsiveBreakpoints = Object.freeze({
  phoneMax: 479,
  wideMin: 840,
});

const PHONE_SAFE_WIDTH = 320;

function normalizeWidth(width) {
  return Number.isFinite(width) && width > 0 ? width : PHONE_SAFE_WIDTH;
}

export function resolveResponsiveLayout(inputWidth) {
  const width = normalizeWidth(inputWidth);
  const isPhone = width <= responsiveBreakpoints.phoneMax;
  const isWide = width >= responsiveBreakpoints.wideMin;
  const isCompact = !isPhone && !isWide;

  if (isPhone) {
    return {
      mode: 'phone',
      width,
      isPhone: true,
      isCompact: false,
      isWide: false,
      authDirection: 'column',
      roleDirection: 'column',
      gutter: 16,
      panelPadding: 16,
      panelRadius: 24,
      displayFontSize: 40,
      displayLineHeight: 44,
      shellTitleFontSize: 24,
      contentMaxWidth: 1100,
      keypadColumnPercent: 29,
      keypadGap: 16,
    };
  }

  if (isCompact) {
    return {
      mode: 'compact',
      width,
      isPhone: false,
      isCompact: true,
      isWide: false,
      authDirection: 'column',
      roleDirection: 'row',
      gutter: 20,
      panelPadding: 24,
      panelRadius: 28,
      displayFontSize: 48,
      displayLineHeight: 52,
      shellTitleFontSize: 26,
      contentMaxWidth: 1100,
      keypadColumnPercent: 29,
      keypadGap: 16,
    };
  }

  return {
    mode: 'wide',
    width,
    isPhone: false,
    isCompact: false,
    isWide: true,
    authDirection: 'row',
    roleDirection: 'row',
    gutter: 24,
    panelPadding: 32,
    panelRadius: 32,
    displayFontSize: 56,
    displayLineHeight: 60,
    shellTitleFontSize: 28,
    contentMaxWidth: 1100,
    keypadColumnPercent: 29,
    keypadGap: 16,
  };
}

