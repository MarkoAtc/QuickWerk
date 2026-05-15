// QuickWerk UI Foundation
// Rebuilt on 2026-05-15 from the Stitch redesign system.
// Added shared components on 2026-05-15 for product maturity.

export const colors = {
  background: '#F8FAFC',
  backgroundMuted: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceDim: '#DCD9DA',
  surfaceBright: '#FCF8F9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8FAFC',
  surfaceContainer: '#F1F5F9',
  surfaceContainerHigh: '#E5E7EB',
  surfaceContainerHighest: '#E2E8F0',
  surfaceVariant: '#E5E7EB',
  text: '#0A0E1A',
  textMuted: '#475569',
  textSoft: '#64748B',
  textInverse: '#F8FAFC',
  outline: '#94A3B8',
  outlineVariant: '#E2E8F0',
  primary: '#0A0E1A',
  onPrimary: '#FFFFFF',
  primaryContainer: '#0F172A',
  onPrimaryContainer: '#CBD5E1',
  secondary: '#0050CC',
  secondaryBright: '#0066FF',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DBEAFE',
  onSecondaryContainer: '#0B3AA4',
  accent: '#0066FF',
  cta: '#FF8A00',
  ctaHover: '#E67C00',
  warning: '#FFD600',
  success: '#10B981',
  successSoft: '#ECFDF5',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#991B1B',
  scrim: 'rgba(10, 14, 26, 0.12)',
  glass: 'rgba(255, 255, 255, 0.82)',
  glassStrong: 'rgba(255, 255, 255, 0.92)',
  glassDark: 'rgba(15, 23, 42, 0.86)',
} as const;

export const spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  container: 20,
  gutter: 16,
  section: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
  card: 16,
  sheet: 24,
  pill: 9999,
} as const;

export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  card: {
    shadowColor: '#0A0E1A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0A0E1A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  overlay: {
    shadowColor: '#0A0E1A',
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cta: {
    shadowColor: '#FF8A00',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;

export const typography = {
  fontFamily: {
    display: 'Inter',
    heading: 'Inter',
    body: 'Inter',
    label: 'Inter',
  },
  fontSize: {
    labelSm: 11,
    labelMd: 12,
    bodySm: 14,
    bodyMd: 16,
    bodyLg: 18,
    headlineSm: 20,
    headlineMd: 24,
    headlineLg: 32,
    displayLg: 40,
  },
  lineHeight: {
    labelSm: 14,
    labelMd: 16,
    bodySm: 20,
    bodyMd: 24,
    bodyLg: 28,
    headlineSm: 28,
    headlineMd: 32,
    headlineLg: 40,
    displayLg: 48,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  letterSpacing: {
    tight: -0.02,
    heading: -0.01,
    label: 0.05,
    normal: 0,
  },
} as const;

export const borders = {
  thin: 1,
  focus: 2,
  soft: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  focusRing: {
    borderWidth: 2,
    borderColor: colors.secondaryBright,
  },
} as const;

export const layout = {
  mobileMaxWidth: 480,
  desktopMaxWidth: 1200,
  inputHeight: 56,
  buttonHeight: 56,
  topBarHeight: 80,
  bottomBarHeight: 88,
  progressHeight: 4,
  avatar: {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 64,
  },
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
  pressScale: 0.98,
} as const;

export const statusColors = {
  available: {
    background: '#ECFDF5',
    text: '#047857',
    dot: '#10B981',
  },
  urgent: {
    background: 'rgba(255, 138, 0, 0.12)',
    text: '#FF8A00',
    dot: '#FF8A00',
  },
  warning: {
    background: '#FEF3C7',
    text: '#B45309',
    dot: '#F59E0B',
  },
  success: {
    background: '#D1FAE5',
    text: '#065F46',
    dot: '#10B981',
  },
  info: {
    background: '#DBEAFE',
    text: '#1D4ED8',
    dot: '#2563EB',
  },
  muted: {
    background: colors.surfaceContainer,
    text: colors.textMuted,
    dot: colors.outline,
  },
  error: {
    background: colors.errorContainer,
    text: colors.onErrorContainer,
    dot: colors.error,
  },
} as const;

export const componentStyles = {
  screen: {
    base: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.container,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
  },
  topBar: {
    container: {
      height: layout.topBarHeight,
      paddingHorizontal: spacing.container,
      paddingVertical: spacing.md,
      backgroundColor: colors.glass,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(199, 198, 204, 0.3)',
    },
  },
  card: {
    base: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: spacing.md,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: spacing.md,
      ...shadow.card,
    },
    dark: {
      backgroundColor: colors.primaryContainer,
      borderRadius: radius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
  },
  button: {
    primary: {
      height: layout.buttonHeight,
      backgroundColor: colors.cta,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      ...shadow.cta,
    },
    secondary: {
      height: layout.buttonHeight,
      backgroundColor: colors.secondaryBright,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    dark: {
      height: layout.buttonHeight,
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    ghost: {
      height: layout.buttonHeight,
      backgroundColor: 'transparent',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
  },
  input: {
    base: {
      minHeight: layout.inputHeight,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
    },
    darkGlass: {
      minHeight: layout.inputHeight,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.10)',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.onPrimary,
    },
  },
  chip: {
    base: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignSelf: 'flex-start',
    },
  },
  progress: {
    track: {
      height: layout.progressHeight,
      backgroundColor: colors.surfaceVariant,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
  },
} as const;

// ── Shared Component Presets ──────────────────────────────
// Stable, low-risk primitives for screen refactors.

export const shared = {
  heroSection: {
    light: {
      container: {
        borderRadius: 32,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.card,
      },
      eyebrow: {
        color: colors.textMuted,
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
      title: {
        color: colors.text,
        fontSize: 42,
        lineHeight: 46,
        fontWeight: typography.fontWeight.bold,
        letterSpacing: -0.8,
      },
      subtitle: {
        marginTop: spacing.md,
        color: colors.textSoft,
        fontSize: typography.fontSize.bodyLg,
        lineHeight: typography.lineHeight.bodyLg,
      },
    },
    dark: {
      container: {
        borderRadius: 32,
        padding: spacing.xl,
        backgroundColor: colors.primaryContainer,
        ...shadow.elevated,
      },
      eyebrow: {
        color: colors.onPrimaryContainer,
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
      title: {
        color: '#FFFFFF',
        fontSize: 42,
        lineHeight: 46,
        fontWeight: typography.fontWeight.bold,
        letterSpacing: -0.8,
      },
      subtitle: {
        marginTop: spacing.md,
        color: colors.onPrimaryContainer,
        fontSize: typography.fontSize.bodyLg,
        lineHeight: typography.lineHeight.bodyLg,
      },
    },
  },
  surfaceCard: {
    base: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: spacing.lg,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: spacing.lg,
      ...shadow.card,
    },
    muted: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 28,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    darkGlass: {
      borderRadius: 32,
      padding: spacing.xl,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    },
  },
  metricCard: {
    light: {
      container: {
        flex: 1,
        borderRadius: 20,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      },
      label: {
        color: colors.textMuted,
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
      value: {
        marginTop: spacing.xs,
        color: colors.text,
        fontSize: typography.fontSize.headlineSm,
        fontWeight: typography.fontWeight.bold,
      },
    },
    dark: {
      container: {
        flex: 1,
        borderRadius: 20,
        padding: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      },
      label: {
        color: colors.onPrimaryContainer,
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
      value: {
        marginTop: spacing.xs,
        color: '#FFFFFF',
        fontSize: typography.fontSize.headlineSm,
        fontWeight: typography.fontWeight.bold,
      },
    },
  },
  statusBadge: {
    neutral: {
      container: {
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceContainer,
      },
      label: {
        color: colors.textMuted,
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
    },
    success: {
      container: {
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
      },
      label: {
        color: '#047857',
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
    },
    warning: {
      container: {
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255, 138, 0, 0.14)',
      },
      label: {
        color: colors.cta,
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
    },
  },
  sectionBlock: {
    title: {
      color: colors.text,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: typography.fontWeight.bold,
    },
    subtitle: {
      marginTop: spacing.sm,
      color: colors.textMuted,
      fontSize: typography.fontSize.bodyMd,
      lineHeight: typography.lineHeight.bodyMd,
    },
  },
  ctaButton: {
    primary: {
      container: {
        ...componentStyles.button.primary,
      },
      label: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
    },
    dark: {
      container: {
        ...componentStyles.button.dark,
      },
      label: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.bold,
      },
    },
    ghost: {
      container: {
        ...componentStyles.button.ghost,
      },
      label: {
        color: colors.text,
        fontSize: typography.fontSize.labelMd,
        fontWeight: typography.fontWeight.bold,
      },
    },
  },
} as const;

export const designTokens = {
  color: {
    primary: colors.primary,
    accent: colors.accent,
    cta: colors.cta,
    surface: colors.surface,
    text: colors.text,
    muted: colors.textMuted,
  },
  radius: {
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.xl,
  },
  spacing: {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadow = typeof shadow;
export type Typography = typeof typography;
export type Borders = typeof borders;
export type Layout = typeof layout;
export type Motion = typeof motion;
export type StatusColors = typeof statusColors;
export type ComponentStyles = typeof componentStyles;
export type SharedStyles = typeof shared;
