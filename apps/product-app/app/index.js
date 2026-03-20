import { Text, View } from 'react-native';

import { ProductRouteLink } from '../src/shared/product-route-link';
import { ProductScreenShell } from '../src/shared/product-screen-shell';

function JourneyCard({ title, points }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 240,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#D9E2EE',
        backgroundColor: '#FFFFFF',
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#12305C' }}>{title}</Text>
      {points.map((point) => (
        <Text key={point} style={{ marginTop: 8, color: '#334155' }}>
          • {point}
        </Text>
      ))}
    </View>
  );
}

export default function ProductHomeScreen() {
  return (
    <ProductScreenShell
      title="QuickWerk"
      subtitle="Find the right craft professional in minutes — from urgent repairs to scheduled jobs."
      contentContainerStyle={{ justifyContent: 'center', paddingTop: 24, paddingBottom: 24 }}
      testID="product-home-screen"
    >
      <View
        style={{
          marginTop: 4,
          borderRadius: 14,
          backgroundColor: '#EEF4FF',
          borderWidth: 1,
          borderColor: '#D1E0FF',
          padding: 14,
        }}
      >
        <Text style={{ color: '#12305C', fontWeight: '700', fontSize: 16 }}>Today’s client demo focus</Text>
        <Text style={{ marginTop: 6, color: '#334155', lineHeight: 21 }}>
          Customer onboarding, provider discovery, and booking continuation flow in a clean read-only MVP walkthrough.
        </Text>
      </View>

      <View style={{ marginTop: 14, flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <JourneyCard
          title="1) Customer starts"
          points={['Simple auth flow', 'Fast re-entry for returning users', 'Clear next step into marketplace']}
        />
        <JourneyCard
          title="2) Provider discovery"
          points={['Trust badges and response cues', 'Readable cards for quick comparison', 'Service-focused booking context']}
        />
        <JourneyCard
          title="3) Booking continuation"
          points={['Urgent + scheduled journey preview', 'Transparent status communication', 'Demo-safe read-only flow for client calls']}
        />
      </View>

      <ProductRouteLink
        href="/auth"
        title="Start customer flow"
        description="Open the polished sign-in / sign-up / recovery experience."
        testID="product-home-open-auth-link"
      />
      <ProductRouteLink
        href="/marketplace-preview"
        title="Open marketplace walkthrough"
        description="Show the post-login discovery and booking journey."
        testID="product-home-open-marketplace-preview-link"
      />
    </ProductScreenShell>
  );
}
