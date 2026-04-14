import { createMarketplacePreviewRequest } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

export type MarketplacePreviewSection = {
  ctaLabel: string;
  dataCoverageBandToken?: 'coverage-high' | 'coverage-low' | 'coverage-medium';
  dataCoverageHint?: string;
  dataFreshnessLabel?: 'fresh' | 'stable' | 'stale';
  dataFreshnessMinutes?: number;
  description: string;
  highlights: string[];
  id: string;
  payloadCompletenessPercent?: number;
  readinessNote?: string;
  responseSlaHint?: string;
  sectionAlignmentToken?: 'align-mixed' | 'align-risk' | 'align-strong';
  sectionHealthLevel?: 'critical' | 'good' | 'watch';
  sectionSeverityBadgeToken?: 'badge-critical' | 'badge-good' | 'badge-watch';
  title: string;
  trustBadges?: string[];
};

type RawMarketplacePreviewSection = {
  ctaLabel?: string;
  dataFreshnessMinutes?: number;
  description?: string;
  highlights?: string[];
  id?: string;
  payloadCompletenessPercent?: number;
  readinessNote?: string;
  responseSlaHint?: string;
  title?: string;
  trustBadges?: string[];
};

type MarketplacePreviewPayload = {
  sections?: RawMarketplacePreviewSection[];
};

export type PreviewHealthIndicator = {
  alignmentToken: 'align-mixed' | 'align-risk' | 'align-strong';
  coverageBandToken: 'coverage-high' | 'coverage-low' | 'coverage-medium';
  coverageMinimalSections: number;
  coveragePartialSections: number;
  coverageWellSections: number;
  criticalSections: number;
  goodSections: number;
  level: 'critical' | 'good' | 'watch';
  narrative: string;
  riskHeadline: string;
  severityBadgeToken: 'badge-critical' | 'badge-good' | 'badge-watch';
  statusDigest: string;
  summary: string;
  watchSections: number;
};

export type MarketplacePreviewResult = {
  errorMessage?: string;
  previewHealth: PreviewHealthIndicator;
  sections: readonly MarketplacePreviewSection[];
  source: 'fallback' | 'platform-api';
};

export const fallbackMarketplacePreviewSections: readonly MarketplacePreviewSection[] = [
  {
    id: 'provider-discovery',
    title: 'Provider discovery preview',
    description:
      'Local fixture cards show how customers can compare response speed, trust signals, and first-visit availability without loading real marketplace data.',
    highlights: ['3 local fixture providers', 'service area + response labels', 'review and trust badges'],
    trustBadges: ['ID verified', 'Business docs reviewed'],
    responseSlaHint: 'Median provider response under 8 minutes in pilot fixtures',
    readinessNote: 'Provider card detail is demo-safe and read-only in this slice.',
    dataFreshnessMinutes: 12,
    payloadCompletenessPercent: 92,
    dataCoverageHint: 'Optional preview metadata is well-covered for this section.',
    dataCoverageBandToken: 'coverage-high',
    sectionHealthLevel: 'good',
    sectionSeverityBadgeToken: 'badge-good',
    sectionAlignmentToken: 'align-strong',
    ctaLabel: 'Open provider card',
  },
  {
    id: 'booking-continuation',
    title: 'Booking continuation preview',
    description:
      'A tiny post-auth continuation panel previews urgent and scheduled handoff states to keep the customer story visible during the meeting.',
    highlights: ['urgent + scheduled split', 'next-step summary', 'demo-safe booking context only'],
    trustBadges: ['SLA monitored', 'Status transitions audited'],
    responseSlaHint: 'Urgent preview flow targets first acknowledgement within 5 minutes',
    readinessNote: 'Transition events are preview-only and do not trigger worker jobs yet.',
    dataFreshnessMinutes: 5,
    payloadCompletenessPercent: 88,
    dataCoverageHint: 'Optional preview metadata is well-covered for this section.',
    dataCoverageBandToken: 'coverage-high',
    sectionHealthLevel: 'watch',
    sectionSeverityBadgeToken: 'badge-watch',
    sectionAlignmentToken: 'align-mixed',
    ctaLabel: 'Start booking flow',
  },
  {
    id: 'onboarding-readiness',
    title: 'Provider onboarding readiness',
    description:
      'The first shared onboarding checkpoints are surfaced as read-only status pills so stakeholders can see trust-layer direction before backend wiring.',
    highlights: ['account setup', 'business profile', 'verification docs'],
    dataCoverageHint: 'Optional preview metadata is minimal for this section.',
    dataCoverageBandToken: 'coverage-low',
    sectionHealthLevel: 'good',
    sectionSeverityBadgeToken: 'badge-good',
    sectionAlignmentToken: 'align-risk',
    ctaLabel: 'Continue provider onboarding',
  },
];

const deriveAlignmentToken = ({
  severity,
  coverage,
}: {
  coverage: 'coverage-high' | 'coverage-low' | 'coverage-medium';
  severity: 'badge-critical' | 'badge-good' | 'badge-watch';
}) => {
  if (severity === 'badge-critical' || coverage === 'coverage-low') {
    return 'align-risk' as const;
  }

  if (severity === 'badge-watch' || coverage === 'coverage-medium') {
    return 'align-mixed' as const;
  }

  return 'align-strong' as const;
};

const buildPreviewStatusDigest = ({
  level,
  severityBadgeToken,
  coverageBandToken,
  alignmentToken,
  goodSections,
  watchSections,
  criticalSections,
  coverageWellSections,
  coveragePartialSections,
  coverageMinimalSections,
}: {
  alignmentToken: 'align-mixed' | 'align-risk' | 'align-strong';
  coverageBandToken: 'coverage-high' | 'coverage-low' | 'coverage-medium';
  coverageMinimalSections: number;
  coveragePartialSections: number;
  coverageWellSections: number;
  criticalSections: number;
  goodSections: number;
  level: 'critical' | 'good' | 'watch';
  severityBadgeToken: 'badge-critical' | 'badge-good' | 'badge-watch';
  watchSections: number;
}) =>
  `${level}|${severityBadgeToken}|${coverageBandToken}|${alignmentToken}|g${goodSections}-w${watchSections}-c${criticalSections}|cw${coverageWellSections}-cp${coveragePartialSections}-cm${coverageMinimalSections}`;

const derivePreviewHealth = (sections: readonly MarketplacePreviewSection[]): PreviewHealthIndicator => {
  if (sections.length === 0) {
    return {
      level: 'critical',
      summary: 'Marketplace preview payload is empty.',
      narrative: 'No valid preview sections were returned by platform-api.',
      riskHeadline: 'Critical risk: preview cannot render customer entry sections from live data.',
      severityBadgeToken: 'badge-critical',
      statusDigest: 'critical|badge-critical|coverage-low|align-risk|g0-w0-c0|cw0-cp0-cm0',
      coverageBandToken: 'coverage-low',
      alignmentToken: 'align-risk',
      criticalSections: 0,
      watchSections: 0,
      goodSections: 0,
      coverageMinimalSections: 0,
      coveragePartialSections: 0,
      coverageWellSections: 0,
    };
  }

  const completenessValues = sections
    .map((section) => section.payloadCompletenessPercent)
    .filter((value): value is number => typeof value === 'number');

  const averageCompleteness =
    completenessValues.length > 0
      ? completenessValues.reduce((sum, value) => sum + value, 0) / completenessValues.length
      : undefined;

  const criticalSections = sections.filter((section) => section.sectionHealthLevel === 'critical').length;
  const watchSections = sections.filter((section) => section.sectionHealthLevel === 'watch').length;
  const goodSections = sections.filter((section) => section.sectionHealthLevel === 'good').length;
  const coverageMinimalSections = sections.filter((section) => section.dataCoverageHint?.includes('minimal')).length;
  const coveragePartialSections = sections.filter((section) => section.dataCoverageHint?.includes('partially')).length;
  const coverageWellSections = sections.filter((section) => section.dataCoverageHint?.includes('well-covered')).length;
  const coverageBandToken =
    coverageMinimalSections > 0 ? 'coverage-low' : coveragePartialSections > 0 ? 'coverage-medium' : 'coverage-high';

  if (criticalSections > 0) {
    const severityBadgeToken = 'badge-critical' as const;
    const alignmentToken = deriveAlignmentToken({
      severity: severityBadgeToken,
      coverage: coverageBandToken,
    });

    return {
      level: 'critical',
      summary: 'Preview payload completeness is below target in at least one section.',
      narrative:
        coverageMinimalSections > 0
          ? 'Critical preview risk: at least one section is low-completeness and metadata coverage is minimal.'
          : 'Critical preview risk: at least one section is low-completeness and should be corrected before demos.',
      riskHeadline: `Critical risk in ${criticalSections} section(s); watch ${watchSections} more.`,
      severityBadgeToken,
      statusDigest: buildPreviewStatusDigest({
        level: 'critical',
        severityBadgeToken,
        coverageBandToken,
        alignmentToken,
        goodSections,
        watchSections,
        criticalSections,
        coverageWellSections,
        coveragePartialSections,
        coverageMinimalSections,
      }),
      coverageBandToken,
      alignmentToken,
      criticalSections,
      watchSections,
      goodSections,
      coverageMinimalSections,
      coveragePartialSections,
      coverageWellSections,
    };
  }

  if (watchSections > 0 || (typeof averageCompleteness === 'number' && averageCompleteness < 90)) {
    const severityBadgeToken = 'badge-watch' as const;
    const alignmentToken = deriveAlignmentToken({
      severity: severityBadgeToken,
      coverage: coverageBandToken,
    });

    return {
      level: 'watch',
      summary: 'Preview quality is acceptable but one or more sections should be monitored.',
      narrative:
        coverageMinimalSections > 0
          ? 'Watch state: quality is usable, but sparse metadata in some sections may weaken stakeholder confidence.'
          : 'Watch state: quality is usable, with a few sections needing closer monitoring.',
      riskHeadline: `Watch state across ${watchSections} section(s); no critical sections currently.`,
      severityBadgeToken,
      statusDigest: buildPreviewStatusDigest({
        level: 'watch',
        severityBadgeToken,
        coverageBandToken,
        alignmentToken,
        goodSections,
        watchSections,
        criticalSections,
        coverageWellSections,
        coveragePartialSections,
        coverageMinimalSections,
      }),
      coverageBandToken,
      alignmentToken,
      criticalSections,
      watchSections,
      goodSections,
      coverageMinimalSections,
      coveragePartialSections,
      coverageWellSections,
    };
  }

  const severityBadgeToken = 'badge-good' as const;
  const alignmentToken = deriveAlignmentToken({
    severity: severityBadgeToken,
    coverage: coverageBandToken,
  });

  return {
    level: 'good',
    summary: 'Preview quality indicators are healthy for the current demo slice.',
    narrative:
      coverageMinimalSections > 0
        ? 'Healthy baseline with minor metadata gaps that can be filled in subsequent slices.'
        : 'Healthy baseline: section quality and metadata coverage are aligned for demos.',
    riskHeadline: `No critical/watch sections; ${goodSections} section(s) currently healthy.`,
    severityBadgeToken,
    statusDigest: buildPreviewStatusDigest({
      level: 'good',
      severityBadgeToken,
      coverageBandToken,
      alignmentToken,
      goodSections,
      watchSections,
      criticalSections,
      coverageWellSections,
      coveragePartialSections,
      coverageMinimalSections,
    }),
    coverageBandToken,
    alignmentToken,
    criticalSections,
    watchSections,
    goodSections,
    coverageMinimalSections,
    coveragePartialSections,
    coverageWellSections,
  };
};

export const defaultMarketplacePreviewResult = {
  sections: fallbackMarketplacePreviewSections,
  previewHealth: derivePreviewHealth(fallbackMarketplacePreviewSections),
  source: 'fallback',
} as const satisfies MarketplacePreviewResult;

const normalizeMarketplacePreviewSection = (
  value: RawMarketplacePreviewSection,
): MarketplacePreviewSection | null => {
  if (
    !value.id ||
    !value.title ||
    !value.description ||
    !value.ctaLabel ||
    !value.highlights ||
    !value.highlights.every((highlight: string) => typeof highlight === 'string')
  ) {
    return null;
  }

  const trustBadges = value.trustBadges?.filter((badge: string) => typeof badge === 'string');
  const dataFreshnessMinutes =
    typeof value.dataFreshnessMinutes === 'number' && Number.isFinite(value.dataFreshnessMinutes)
      ? value.dataFreshnessMinutes
      : undefined;

  const dataFreshnessLabel =
    typeof dataFreshnessMinutes === 'number'
      ? dataFreshnessMinutes <= 5
        ? 'fresh'
        : dataFreshnessMinutes <= 15
          ? 'stable'
          : 'stale'
      : undefined;

  const payloadCompletenessPercent =
    typeof value.payloadCompletenessPercent === 'number' &&
    Number.isFinite(value.payloadCompletenessPercent) &&
    value.payloadCompletenessPercent >= 0 &&
    value.payloadCompletenessPercent <= 100
      ? value.payloadCompletenessPercent
      : undefined;

  const sectionHealthLevel =
    typeof payloadCompletenessPercent === 'number' && payloadCompletenessPercent < 80
      ? 'critical'
      : dataFreshnessLabel === 'stale' ||
          (typeof payloadCompletenessPercent === 'number' && payloadCompletenessPercent < 90)
        ? 'watch'
        : 'good';

  const optionalFieldPresenceCount = [
    typeof value.responseSlaHint === 'string',
    typeof value.readinessNote === 'string',
    typeof dataFreshnessMinutes === 'number',
    typeof payloadCompletenessPercent === 'number',
    trustBadges && trustBadges.length > 0,
  ].filter(Boolean).length;

  const dataCoverageHint =
    optionalFieldPresenceCount >= 4
      ? 'Optional preview metadata is well-covered for this section.'
      : optionalFieldPresenceCount >= 2
        ? 'Optional preview metadata is partially covered for this section.'
        : 'Optional preview metadata is minimal for this section.';

  const dataCoverageBandToken =
    optionalFieldPresenceCount >= 4
      ? 'coverage-high'
      : optionalFieldPresenceCount >= 2
        ? 'coverage-medium'
        : 'coverage-low';

  const sectionSeverityBadgeToken =
    sectionHealthLevel === 'critical'
      ? 'badge-critical'
      : sectionHealthLevel === 'watch'
        ? 'badge-watch'
        : 'badge-good';

  const sectionAlignmentToken = deriveAlignmentToken({
    severity: sectionSeverityBadgeToken,
    coverage: dataCoverageBandToken,
  });

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    highlights: value.highlights,
    ctaLabel: value.ctaLabel,
    dataCoverageHint,
    dataCoverageBandToken,
    dataFreshnessMinutes,
    dataFreshnessLabel,
    payloadCompletenessPercent,
    sectionAlignmentToken,
    sectionHealthLevel,
    sectionSeverityBadgeToken,
    responseSlaHint: typeof value.responseSlaHint === 'string' ? value.responseSlaHint : undefined,
    readinessNote: typeof value.readinessNote === 'string' ? value.readinessNote : undefined,
    trustBadges: trustBadges && trustBadges.length > 0 ? trustBadges : undefined,
  };
};

const createMarketplacePreviewUrl = () => {
  const request = createMarketplacePreviewRequest();

  return `${runtimeConfig.platformApiBaseUrl}${request.path}`;
};

export async function loadMarketplacePreview(fetchImpl: typeof fetch = fetch): Promise<MarketplacePreviewResult> {
  const request = createMarketplacePreviewRequest();

  try {
    const response = await fetchImpl(createMarketplacePreviewUrl(), {
      method: request.method,
    });

    if (!response.ok) {
      return {
        ...defaultMarketplacePreviewResult,
        errorMessage: `Marketplace preview request failed with HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as MarketplacePreviewPayload;
    const sections =
      payload.sections
        ?.map((section) => normalizeMarketplacePreviewSection(section))
        .filter((section): section is MarketplacePreviewSection => section !== null) ?? [];

    if (sections.length === 0) {
      return {
        sections: [],
        previewHealth: derivePreviewHealth([]),
        source: 'platform-api',
        errorMessage: 'Marketplace preview payload did not include valid sections.',
      };
    }

    return {
      sections,
      previewHealth: derivePreviewHealth(sections),
      source: 'platform-api',
    };
  } catch (error) {
    return {
      ...defaultMarketplacePreviewResult,
      errorMessage: error instanceof Error ? error.message : 'Unknown marketplace preview failure.',
    };
  }
}
