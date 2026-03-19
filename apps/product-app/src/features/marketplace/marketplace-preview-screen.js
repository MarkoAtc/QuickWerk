import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';

import { ProductRouteLink } from '../../shared/product-route-link';
import { ProductScreenShell } from '../../shared/product-screen-shell';
import { productAppShell } from '../../shared/app-shell';
import { defaultMarketplacePreviewResult, loadMarketplacePreview } from './marketplace-preview-data';

function PreviewSectionCard({ section }) {
  return (
    <View
      testID={`marketplace-preview-section-${section.id}`}
      style={{
        marginTop: 12,
        borderRadius: 14,
        padding: 14,
        backgroundColor: productAppShell.theme.color.surface,
        borderWidth: 1,
        borderColor: productAppShell.theme.color.primary,
      }}
    >
      <Text style={{ color: productAppShell.theme.color.primary, fontSize: 17, fontWeight: '600' }}>{section.title}</Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>{section.description}</Text>
      {section.highlights.map((highlight) => (
        <Text key={highlight} style={{ marginTop: 6, color: productAppShell.theme.color.text }}>
          • {highlight}
        </Text>
      ))}
      {section.trustBadges?.length ? (
        <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {section.trustBadges.map((badge) => (
            <Text
              key={badge}
              style={{
                color: productAppShell.theme.color.primary,
                borderWidth: 1,
                borderColor: productAppShell.theme.color.primary,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                fontSize: 12,
              }}
            >
              {badge}
            </Text>
          ))}
        </View>
      ) : null}
      {section.responseSlaHint ? (
        <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
          Response SLA hint: {section.responseSlaHint}
        </Text>
      ) : null}
      {typeof section.dataFreshnessMinutes === 'number' ? (
        <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
          Data freshness: ~{section.dataFreshnessMinutes} min
          {section.dataFreshnessLabel ? ` (${section.dataFreshnessLabel})` : ''}
        </Text>
      ) : null}
      {typeof section.payloadCompletenessPercent === 'number' ? (
        <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
          Payload completeness: {section.payloadCompletenessPercent}%
        </Text>
      ) : null}
      {section.sectionHealthLevel ? (
        <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
          Section health: {section.sectionHealthLevel}
        </Text>
      ) : null}
      {section.sectionSeverityBadgeToken ? (
        <Text testID={`marketplace-preview-section-badge-${section.id}`} style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
          Section badge token: {section.sectionSeverityBadgeToken}
        </Text>
      ) : null}
      {section.readinessNote ? (
        <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
          Readiness note: {section.readinessNote}
        </Text>
      ) : null}
      {section.dataCoverageHint ? (
        <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
          Data coverage: {section.dataCoverageHint}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={section.ctaLabel}
        accessibilityHint="Disabled placeholder for the future shared marketplace action."
        accessibilityState={{ disabled: true }}
        disabled
        testID={`marketplace-preview-cta-${section.id}`}
        style={{
          marginTop: 12,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: productAppShell.theme.color.primary,
          opacity: 0.75,
        }}
      >
        <Text style={{ color: productAppShell.theme.color.surface, fontWeight: '600' }}>{section.ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const healthLevelStyles = {
  good: {
    borderColor: productAppShell.theme.color.primary,
    textColor: productAppShell.theme.color.primary,
  },
  watch: {
    borderColor: productAppShell.theme.color.accent,
    textColor: productAppShell.theme.color.accent,
  },
  critical: {
    borderColor: '#B22222',
    textColor: '#B22222',
  },
};

export function MarketplacePreviewScreen() {
  const [previewResult, setPreviewResult] = useState(defaultMarketplacePreviewResult);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void loadMarketplacePreview()
      .then((nextResult) => {
        if (isMounted) {
          setPreviewResult(nextResult);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ProductScreenShell
      title="Marketplace continuation preview"
      subtitle="Presentation-focused post-auth slice in the shared product app. Demo-safe with read-only preview API support."
      testID="marketplace-preview-screen"
    >
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
        Preview source: {isLoading ? 'loading' : previewResult.source} · no backend persistence · no production booking action
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
        This route now supports one read-only preview API slice with explicit fallback behavior to local fixtures.
      </Text>
      <View
        testID="marketplace-preview-health"
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: healthLevelStyles[previewResult.previewHealth.level].borderColor,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 8,
        }}
      >
        <Text
          testID="marketplace-preview-health-level"
          style={{ color: healthLevelStyles[previewResult.previewHealth.level].textColor, fontWeight: '600' }}
        >
          Preview health: {previewResult.previewHealth.level}
        </Text>
        <Text testID="marketplace-preview-health-badge-token" style={{ marginTop: 4, color: productAppShell.theme.color.text }}>
          Severity badge token: {previewResult.previewHealth.severityBadgeToken}
        </Text>
        <Text style={{ marginTop: 4, color: productAppShell.theme.color.text }}>{previewResult.previewHealth.summary}</Text>
        <Text testID="marketplace-preview-health-counts" style={{ marginTop: 4, color: productAppShell.theme.color.text }}>
          Sections → good: {previewResult.previewHealth.goodSections} · watch: {previewResult.previewHealth.watchSections} · critical:{' '}
          {previewResult.previewHealth.criticalSections}
        </Text>
        <Text testID="marketplace-preview-coverage-counts" style={{ marginTop: 4, color: productAppShell.theme.color.text }}>
          Coverage → well: {previewResult.previewHealth.coverageWellSections} · partial:{' '}
          {previewResult.previewHealth.coveragePartialSections} · minimal: {previewResult.previewHealth.coverageMinimalSections}
        </Text>
        <Text testID="marketplace-preview-health-narrative" style={{ marginTop: 4, color: productAppShell.theme.color.text }}>
          {previewResult.previewHealth.narrative}
        </Text>
      </View>
      {previewResult.errorMessage ? (
        <Text testID="marketplace-preview-error-message" style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
          Preview fallback: {previewResult.errorMessage}
        </Text>
      ) : null}

      <View
        style={{
          marginTop: 14,
          borderRadius: 14,
          padding: 14,
          backgroundColor: productAppShell.theme.color.primary,
        }}
      >
        <Text style={{ color: productAppShell.theme.color.surface, fontWeight: '600' }}>
          Shared onboarding direction ({productAppShell.onboardingSteps.length} steps)
        </Text>
        {productAppShell.onboardingSteps.map((step, index) => (
          <Text key={step.id} style={{ marginTop: 6, color: productAppShell.theme.color.surface }}>
            {index + 1}. {step.label}
          </Text>
        ))}
      </View>

      {previewResult.sections.map((section) => (
        <PreviewSectionCard key={section.id} section={section} />
      ))}

      <ProductRouteLink
        href="/auth"
        title="Back to auth entry"
        variant="outline"
        testID="marketplace-preview-back-auth-link"
      />
      <ProductRouteLink
        href="/"
        title="Back to product home"
        variant="outline"
        testID="marketplace-preview-back-home-link"
      />
    </ProductScreenShell>
  );
}
