import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';

import { ProductRouteLink } from '../../shared/product-route-link';
import { ProductScreenShell } from '../../shared/product-screen-shell';
import { productAppShell } from '../../shared/app-shell';
import { defaultMarketplacePreviewResult, loadMarketplacePreview } from './marketplace-preview-data';

const healthLevelStyles = {
  good: {
    borderColor: '#2E7D32',
    pillBackground: '#E8F5E9',
    textColor: '#2E7D32',
    label: 'Demo-ready',
  },
  watch: {
    borderColor: '#B26A00',
    pillBackground: '#FFF4E5',
    textColor: '#B26A00',
    label: 'In progress',
  },
  critical: {
    borderColor: '#B22222',
    pillBackground: '#FDECEC',
    textColor: '#B22222',
    label: 'Early draft',
  },
};

const healthNarratives = {
  good: 'Core customer flow is present and easy to walkthrough in a live call.',
  watch: 'Flow is usable for a demo, with a few areas still represented as placeholders.',
  critical: 'Flow direction is visible, but this area is still very early and mostly placeholder.',
};

function MetaPill({ text, tone = 'default', testID }) {
  const toneStyles =
    tone === 'accent'
      ? {
          color: productAppShell.theme.color.accent,
          borderColor: '#C6E9E6',
          backgroundColor: '#F0FBFA',
        }
      : {
          color: productAppShell.theme.color.text,
          borderColor: '#D7DFEA',
          backgroundColor: '#FFFFFF',
        };

  return (
    <Text
      testID={testID}
      style={{
        color: toneStyles.color,
        borderColor: toneStyles.borderColor,
        backgroundColor: toneStyles.backgroundColor,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        fontSize: 12,
      }}
    >
      {text}
    </Text>
  );
}

function PreviewSectionCard({ section }) {
  return (
    <View
      testID={`marketplace-preview-section-${section.id}`}
      style={{
        marginTop: 14,
        borderRadius: 16,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D7DFEA',
        shadowColor: '#0F172A',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <Text style={{ color: productAppShell.theme.color.primary, fontSize: 19, fontWeight: '700' }}>{section.title}</Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text, lineHeight: 22 }}>{section.description}</Text>

      <View style={{ marginTop: 12, gap: 6 }}>
        {section.highlights.map((highlight) => (
          <Text key={highlight} style={{ color: productAppShell.theme.color.text }}>
            • {highlight}
          </Text>
        ))}
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {section.trustBadges?.map((badge) => (
          <MetaPill key={badge} text={badge} />
        ))}

        {section.responseSlaHint ? <MetaPill tone="accent" text={`Expected speed: ${section.responseSlaHint}`} /> : null}
      </View>

      {section.readinessNote ? (
        <Text style={{ marginTop: 12, color: '#334155', fontStyle: 'italic' }}>What this demo highlights: {section.readinessNote}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={section.ctaLabel}
        accessibilityHint="Preview action for the demo flow."
        testID={`marketplace-preview-cta-${section.id}`}
        style={{
          marginTop: 14,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: productAppShell.theme.color.primary,
          opacity: 0.95,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{section.ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

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

  const levelStyle = healthLevelStyles[previewResult.previewHealth.level];

  return (
    <ProductScreenShell
      title="QuickWerk customer demo"
      subtitle="A guided preview of how customers discover providers, build trust, and continue into booking."
      testID="marketplace-preview-screen"
      contentContainerStyle={{ maxWidth: 980, alignSelf: 'center', width: '100%' }}
    >
      <View
        style={{
          marginTop: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#D7DFEA',
          backgroundColor: '#FFFFFF',
          padding: 16,
        }}
      >
        <Text style={{ color: productAppShell.theme.color.accent }}>
          Data source:{' '}
          {isLoading
            ? 'loading…'
            : previewResult.source === 'platform-api'
              ? 'Platform API'
              : 'Fallback fixture (request failure)'}
        </Text>

        <View
          testID="marketplace-preview-health"
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: levelStyle.borderColor,
            borderRadius: 12,
            padding: 12,
            backgroundColor: '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text
              testID="marketplace-preview-health-level"
              style={{
                color: levelStyle.textColor,
                backgroundColor: levelStyle.pillBackground,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                fontWeight: '700',
              }}
            >
              {levelStyle.label}
            </Text>
            <Text style={{ color: '#0F172A', fontWeight: '600' }}>Demo readiness</Text>
          </View>

          <Text testID="marketplace-preview-health-risk-headline" style={{ marginTop: 8, color: '#0F172A', fontWeight: '600' }}>
            Demo walkthrough status
          </Text>
          <Text style={{ marginTop: 6, color: '#334155' }}>{healthNarratives[previewResult.previewHealth.level]}</Text>

          <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <MetaPill text="Customer journey demo" />
            <MetaPill text="Provider discovery" />
            <MetaPill text="Booking continuation" />
          </View>
        </View>

        {previewResult.errorMessage ? (
          <Text testID="marketplace-preview-error-message" style={{ marginTop: 10, color: '#B26A00' }}>
            {previewResult.errorMessage}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 14,
          borderRadius: 16,
          padding: 16,
          backgroundColor: productAppShell.theme.color.primary,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
          Provider onboarding flow ({productAppShell.onboardingSteps.length} steps)
        </Text>
        {productAppShell.onboardingSteps.map((step, index) => (
          <Text key={step.id} style={{ marginTop: 6, color: '#DBEAFE' }}>
            {index + 1}. {step.label}
          </Text>
        ))}
      </View>

      {previewResult.sections.map((section) => (
        <PreviewSectionCard key={section.id} section={section} />
      ))}

      <View style={{ marginTop: 8 }}>
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
      </View>
    </ProductScreenShell>
  );
}
