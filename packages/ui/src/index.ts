// QuickWerk — Calm Resolution Design System
// Tokens updated 2026-03-24

export const colors = {
  primary: '#6B8E78',      // Calm Sage — buttons, active states, progress bars
  background: '#F9FAF8',   // Warm Off-White — page background
  surface: '#FFFFFF',      // Pure White — cards, bottom sheets
  text: '#2D3748',         // Soft Charcoal — body text, headings
  muted: '#A0AEC0',        // Slate Grey — secondary text, inactive icons, subtle borders
  accent: '#5C7C8A',       // Slate Blue — info badges, trust checkmarks, chat bubbles
  critical: '#E27D60',     // Muted Terracotta — urgent alerts (non-anxiety-inducing)
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  card: 24,
  pill: 100,
} as const;

export const shadow = {
  soft: {
    shadowColor: '#2D3748',
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;

export const typography = {
  fontFamily: {
    heading: 'Fraunces',
    body: 'DM Sans',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    xxxl: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

/** @deprecated Use named token exports above instead */
export const designTokens = {
  color: {
    primary: colors.primary,
    accent: colors.accent,
    surface: colors.surface,
    text: colors.text,
  },
  radius: {
    sm: radius.sm,
    md: radius.md,
    lg: radius.card,
  },
} as const;

export type Shadow = typeof shadow;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;
