import { createMarketplacePreviewRequest } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

export type MarketplacePreviewSection = {
  ctaLabel: string;
  dataCoverageHint?: string;
  dataFreshnessLabel?: 'fresh' | 'stable' | 'stale';
  dataFreshnessMinutes?: number;
  description: string;
  highlights: string[];
  id: string;
  payloadCompletenessPercent?: number;
  readinessNote?: string;
  responseSlaHint?: string;
  sectionHealthLevel?: 'critical' | 'good' | 'watch';
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
  coverageMinimalSections: number;
  coveragePartialSections: number;
  coverageWellSections: number;
  criticalSections: number;
  goodSections: number;
  level: 'critical' | 'good' | 'watch';
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
    sectionHealthLevel: 'good',
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
    sectionHealthLevel: 'watch',
    ctaLabel: 'Start booking flow',
  },
  {
    id: 'onboarding-readiness',
    title: 'Provider onboarding readiness',
    description:
      'The first shared onboarding checkpoints are surfaced as read-only status pills so stakeholders can see trust-layer direction before backend wiring.',
    highlights: ['account setup', 'business profile', 'verification docs'],
    sectionHealthLevel: 'good',
    ctaLabel: 'Continue provider onboarding',
  },
];

const derivePreviewHealth = (sections: readonly MarketplacePreviewSection[]): PreviewHealthIndicator => {
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

  if (criticalSections > 0) {
    return {
      level: 'critical',
      summary: 'Preview payload completeness is below target in at least one section.',
      criticalSections,
      watchSections,
      goodSections,
      coverageMinimalSections,
      coveragePartialSections,
      coverageWellSections,
    };
  }

  if (watchSections > 0 || (typeof averageCompleteness === 'number' && averageCompleteness < 90)) {
    return {
      level: 'watch',
      summary: 'Preview quality is acceptable but one or more sections should be monitored.',
      criticalSections,
      watchSections,
      goodSections,
      coverageMinimalSections,
      coveragePartialSections,
      coverageWellSections,
    };
  }

  return {
    level: 'good',
    summary: 'Preview quality indicators are healthy for the current demo slice.',
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

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    highlights: value.highlights,
    ctaLabel: value.ctaLabel,
    dataCoverageHint,
    dataFreshnessMinutes,
    dataFreshnessLabel,
    payloadCompletenessPercent,
    sectionHealthLevel,
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

    const resolvedSections = sections.length > 0 ? sections : fallbackMarketplacePreviewSections;

    return {
      sections: resolvedSections,
      previewHealth: derivePreviewHealth(resolvedSections),
      source: 'platform-api',
    };
  } catch (error) {
    return {
      ...defaultMarketplacePreviewResult,
      errorMessage: error instanceof Error ? error.message : 'Unknown marketplace preview failure.',
    };
  }
}
