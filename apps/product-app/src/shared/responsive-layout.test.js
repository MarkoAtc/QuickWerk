import { describe, expect, it } from 'vitest';

import { responsiveBreakpoints, resolveResponsiveLayout } from './responsive-layout';

describe('resolveResponsiveLayout', () => {
  it.each([320, 360, 390, 430])('uses bounded phone values at %ipx', (width) => {
    const layout = resolveResponsiveLayout(width);

    expect(layout).toMatchObject({
      mode: 'phone',
      isPhone: true,
      isCompact: false,
      isWide: false,
      authDirection: 'column',
      roleDirection: 'column',
      gutter: 16,
      panelPadding: 16,
      displayFontSize: 40,
      displayLineHeight: 44,
    });
    expect(layout.displayFontSize).toBeLessThanOrEqual(40);
  });

  it('uses a compact single-column composition between phone and wide widths', () => {
    expect(resolveResponsiveLayout(responsiveBreakpoints.phoneMax + 1)).toMatchObject({
      mode: 'compact',
      isPhone: false,
      isCompact: true,
      isWide: false,
      authDirection: 'column',
      roleDirection: 'row',
      displayFontSize: 48,
    });
  });

  it('enables the split composition only at the wide breakpoint', () => {
    expect(resolveResponsiveLayout(responsiveBreakpoints.wideMin - 1).authDirection).toBe('column');
    expect(resolveResponsiveLayout(responsiveBreakpoints.wideMin)).toMatchObject({
      mode: 'wide',
      isWide: true,
      authDirection: 'row',
      roleDirection: 'row',
      contentMaxWidth: 1100,
      displayFontSize: 56,
    });
  });

  it.each([undefined, null, Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'fails safely to the phone layout for invalid width %s',
    (width) => {
      expect(resolveResponsiveLayout(width)).toMatchObject({
        mode: 'phone',
        width: 320,
        authDirection: 'column',
      });
    },
  );

  it('keeps the three-column keypad within a 320px viewport', () => {
    const layout = resolveResponsiveLayout(320);
    const availableWidth = 320 - layout.gutter * 2;
    const occupiedWidth = availableWidth * (layout.keypadColumnPercent / 100) * 3 + layout.keypadGap * 2;

    expect(occupiedWidth).toBeLessThanOrEqual(availableWidth);
  });
});
