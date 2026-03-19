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
          ctaLabel: 'Open API card',
        },
      ],
      source: 'platform-api',
    });
    expect(result.sections[0]?.responseSlaHint).toBeUndefined();
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
          ctaLabel: 'Open API card',
        },
      ],
      source: 'platform-api',
    });
  });
});
