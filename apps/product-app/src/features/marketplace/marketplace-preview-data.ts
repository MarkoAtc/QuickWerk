import { createMarketplacePreviewRequest } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

export type MarketplacePreviewSection = {
  ctaLabel: string;
  dataFreshnessMinutes?: number;
  description: string;
  highlights: string[];
  id: string;
  payloadCompletenessPercent?: number;
  readinessNote?: string;
  responseSlaHint?: string;
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

export type MarketplacePreviewResult = {
  errorMessage?: string;
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
    ctaLabel: 'Start booking flow',
  },
  {
    id: 'onboarding-readiness',
    title: 'Provider onboarding readiness',
    description:
      'The first shared onboarding checkpoints are surfaced as read-only status pills so stakeholders can see trust-layer direction before backend wiring.',
    highlights: ['account setup', 'business profile', 'verification docs'],
    ctaLabel: 'Continue provider onboarding',
  },
];

export const defaultMarketplacePreviewResult = {
  sections: fallbackMarketplacePreviewSections,
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

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    highlights: value.highlights,
    ctaLabel: value.ctaLabel,
    dataFreshnessMinutes:
      typeof value.dataFreshnessMinutes === 'number' && Number.isFinite(value.dataFreshnessMinutes)
        ? value.dataFreshnessMinutes
        : undefined,
    payloadCompletenessPercent:
      typeof value.payloadCompletenessPercent === 'number' &&
      Number.isFinite(value.payloadCompletenessPercent) &&
      value.payloadCompletenessPercent >= 0 &&
      value.payloadCompletenessPercent <= 100
        ? value.payloadCompletenessPercent
        : undefined,
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

    return {
      sections: sections.length > 0 ? sections : fallbackMarketplacePreviewSections,
      source: 'platform-api',
    };
  } catch (error) {
    return {
      ...defaultMarketplacePreviewResult,
      errorMessage: error instanceof Error ? error.message : 'Unknown marketplace preview failure.',
    };
  }
}
