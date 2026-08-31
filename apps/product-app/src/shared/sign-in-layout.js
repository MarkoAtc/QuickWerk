import { resolveResponsiveLayout } from './responsive-layout';

const modes = Object.freeze({
  phone: Object.freeze({ gutter: 16, cardPadding: 16, roleDirection: 'column', controlHeight: 44 }),
  compact: Object.freeze({ gutter: 20, cardPadding: 20, roleDirection: 'row', controlHeight: 44 }),
  wide: Object.freeze({ gutter: 24, cardPadding: 24, roleDirection: 'row', controlHeight: 44 }),
});

export function resolveSignInLayout(width) {
  const responsive = resolveResponsiveLayout(width);
  return { ...responsive, ...(modes[responsive.mode] ?? modes.phone) };
}
