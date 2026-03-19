import { Text, View, Pressable } from 'react-native';

import { ProductRouteLink } from '../../shared/product-route-link';
import { ProductScreenShell } from '../../shared/product-screen-shell';
import { productAppShell } from '../../shared/app-shell';

const previewSections = [
  {
    id: 'provider-discovery',
    title: 'Provider discovery preview',
    description:
      'Local fixture cards show how customers can compare response speed, trust signals, and first-visit availability without loading real marketplace data.',
    highlights: ['3 local fixture providers', 'service area + response labels', 'review and trust badges'],
    ctaLabel: 'Open provider card',
  },
  {
    id: 'booking-continuation',
    title: 'Booking continuation preview',
    description:
      'A tiny post-auth continuation panel previews urgent and scheduled handoff states to keep the customer story visible during the meeting.',
    highlights: ['urgent + scheduled split', 'next-step summary', 'demo-safe booking context only'],
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

export function MarketplacePreviewScreen() {
  return (
    <ProductScreenShell
      title="Marketplace continuation preview"
      subtitle="Presentation-focused post-auth slice in the shared product app. Demo-safe local fixtures only."
      testID="marketplace-preview-screen"
    >
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
        Preview status: local-only fixtures · no backend persistence · no production booking action
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
        Next engineering return point after the meeting: add targeted session-bootstrap fallback coverage and continue auth/session hardening.
      </Text>

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

      {previewSections.map((section) => (
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
