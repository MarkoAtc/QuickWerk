import { describe, expect, it } from 'vitest';

import {
  defaultMarketplacePreviewResult,
  fallbackMarketplacePreviewSections,
  loadMarketplacePreview,
} from './marketplace-preview-data';

describe('loadMarketplacePreview', () => {
  it('falls back with a useful error when the preview request returns non-OK HTTP status', async () => {
    const fetchMock = async () =>
      ({
        ok: false,
        status: 502,
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      ...defaultMarketplacePreviewResult,
      errorMessage: 'Marketplace preview request failed with HTTP 502.',
    });
  });

  it('falls back when fetch throws and preserves the thrown error message', async () => {
    const fetchMock = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3101');
    };

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      ...defaultMarketplacePreviewResult,
      errorMessage: 'connect ECONNREFUSED 127.0.0.1:3101',
    });
  });

  it('sanitizes invalid payload sections and returns fallback sections with platform-api source', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sections: [{ id: 'broken-only-id' }, { title: 'missing-id' }],
        }),
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      sections: fallbackMarketplacePreviewSections,
      source: 'platform-api',
    });
    expect(result.errorMessage).toBeUndefined();
  });

  it('sanitizes invalid optional fields while preserving an otherwise valid section', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sections: [
            {
              id: 'api-provider-discovery',
              title: 'API provider discovery',
              description: 'Read-only API-backed fixture section.',
              highlights: ['alpha', 'beta'],
              responseSlaHint: 123,
              readinessNote: 404,
              dataFreshnessMinutes: 'stale',
              payloadCompletenessPercent: 180,
              trustBadges: ['ID verified', 99],
              ctaLabel: 'Open API card',
            },
          ],
        }),
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      sections: [
        {
          id: 'api-provider-discovery',
          title: 'API provider discovery',
          description: 'Read-only API-backed fixture section.',
          highlights: ['alpha', 'beta'],
          trustBadges: ['ID verified'],
          sectionHealthLevel: 'good',
          sectionSeverityBadgeToken: 'badge-good',
          dataCoverageHint: 'Optional preview metadata is minimal for this section.',
          dataCoverageBandToken: 'coverage-low',
          ctaLabel: 'Open API card',
        },
      ],
      source: 'platform-api',
    });
    expect(result.sections[0]?.responseSlaHint).toBeUndefined();
    expect(result.sections[0]?.readinessNote).toBeUndefined();
    expect(result.sections[0]?.dataFreshnessMinutes).toBeUndefined();
    expect(result.sections[0]?.dataFreshnessLabel).toBeUndefined();
    expect(result.sections[0]?.payloadCompletenessPercent).toBeUndefined();
  });

  it('returns validated api sections when payload is structurally correct', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sections: [
            {
              id: 'api-provider-discovery',
              title: 'API provider discovery',
              description: 'Read-only API-backed fixture section.',
              highlights: ['alpha', 'beta'],
              trustBadges: ['ID verified', 'Top-rated'],
              responseSlaHint: 'Median response under 7 minutes',
              readinessNote: 'Read-only provider detail loaded from API fixture.',
              dataFreshnessMinutes: 3,
              payloadCompletenessPercent: 95,
              ctaLabel: 'Open API card',
            },
          ],
        }),
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      sections: [
        {
          id: 'api-provider-discovery',
          title: 'API provider discovery',
          description: 'Read-only API-backed fixture section.',
          highlights: ['alpha', 'beta'],
          trustBadges: ['ID verified', 'Top-rated'],
          responseSlaHint: 'Median response under 7 minutes',
          readinessNote: 'Read-only provider detail loaded from API fixture.',
          dataFreshnessMinutes: 3,
          dataFreshnessLabel: 'fresh',
          payloadCompletenessPercent: 95,
          sectionHealthLevel: 'good',
          sectionSeverityBadgeToken: 'badge-good',
          dataCoverageHint: 'Optional preview metadata is well-covered for this section.',
          dataCoverageBandToken: 'coverage-high',
          ctaLabel: 'Open API card',
        },
      ],
      source: 'platform-api',
    });
    expect(result.previewHealth.coverageBandToken).toBe('coverage-high');
    expect(result.previewHealth.alignmentToken).toBe('align-strong');
  });

  it('derives stable freshness label for mid-range freshness minutes', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sections: [
            {
              id: 'api-booking-continuation',
              title: 'API booking continuation',
              description: 'Read-only API-backed fixture section.',
              highlights: ['urgent', 'scheduled'],
              dataFreshnessMinutes: 12,
              ctaLabel: 'Open API booking card',
            },
          ],
        }),
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result.sections[0]?.dataFreshnessLabel).toBe('stable');
  });

  it('marks preview health as good when freshness and completeness are healthy', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sections: [
            {
              id: 'api-health-good',
              title: 'API health good',
              description: 'Read-only API-backed fixture section.',
              highlights: ['alpha', 'beta'],
              dataFreshnessMinutes: 4,
              payloadCompletenessPercent: 96,
              ctaLabel: 'Open API card',
            },
          ],
        }),
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result.previewHealth.level).toBe('good');
    expect(result.previewHealth).toMatchObject({
      goodSections: 1,
      watchSections: 0,
      criticalSections: 0,
      coverageWellSections: 0,
      coveragePartialSections: 1,
      coverageMinimalSections: 0,
    });
    expect(result.previewHealth.riskHeadline).toContain('No critical/watch sections');
    expect(result.previewHealth.narrative).toContain('Healthy baseline');
    expect(result.previewHealth.severityBadgeToken).toBe('badge-good');
    expect(result.previewHealth.coverageBandToken).toBe('coverage-medium');
    expect(result.previewHealth.alignmentToken).toBe('align-mixed');
  });

  it('marks preview health as critical when one section has low payload completeness', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sections: [
            {
              id: 'api-health-critical',
              title: 'API health critical',
              description: 'Read-only API-backed fixture section.',
              highlights: ['alpha', 'beta'],
              dataFreshnessMinutes: 4,
              payloadCompletenessPercent: 74,
              ctaLabel: 'Open API card',
            },
          ],
        }),
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result.previewHealth.level).toBe('critical');
    expect(result.previewHealth).toMatchObject({
      goodSections: 0,
      watchSections: 0,
      criticalSections: 1,
      coverageWellSections: 0,
      coveragePartialSections: 1,
      coverageMinimalSections: 0,
    });
    expect(result.previewHealth.riskHeadline).toContain('Critical risk');
    expect(result.previewHealth.narrative).toContain('Critical preview risk');
    expect(result.previewHealth.severityBadgeToken).toBe('badge-critical');
    expect(result.previewHealth.coverageBandToken).toBe('coverage-medium');
    expect(result.previewHealth.alignmentToken).toBe('align-risk');
    expect(result.sections[0]?.sectionHealthLevel).toBe('critical');
    expect(result.sections[0]?.sectionSeverityBadgeToken).toBe('badge-critical');
    expect(result.sections[0]?.dataCoverageBandToken).toBe('coverage-medium');
  });

  it('marks preview health as watch when stale freshness appears without critical completeness drop', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sections: [
            {
              id: 'api-health-watch',
              title: 'API health watch',
              description: 'Read-only API-backed fixture section.',
              highlights: ['alpha', 'beta'],
              dataFreshnessMinutes: 18,
              payloadCompletenessPercent: 91,
              ctaLabel: 'Open API card',
            },
          ],
        }),
      }) as Response;

    const result = await loadMarketplacePreview(fetchMock as typeof fetch);

    expect(result.previewHealth.level).toBe('watch');
    expect(result.previewHealth).toMatchObject({
      goodSections: 0,
      watchSections: 1,
      criticalSections: 0,
      coverageWellSections: 0,
      coveragePartialSections: 1,
      coverageMinimalSections: 0,
    });
    expect(result.previewHealth.riskHeadline).toContain('Watch state');
    expect(result.previewHealth.narrative).toContain('Watch state');
    expect(result.previewHealth.severityBadgeToken).toBe('badge-watch');
    expect(result.previewHealth.coverageBandToken).toBe('coverage-medium');
    expect(result.previewHealth.alignmentToken).toBe('align-mixed');
    expect(result.sections[0]?.sectionHealthLevel).toBe('watch');
    expect(result.sections[0]?.sectionSeverityBadgeToken).toBe('badge-watch');
    expect(result.sections[0]?.dataCoverageBandToken).toBe('coverage-medium');
  });
});
