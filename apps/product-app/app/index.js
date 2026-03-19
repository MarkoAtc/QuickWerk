import { Text } from 'react-native';

import { productAppShell } from '../src/shared/app-shell';
import { ProductRouteLink } from '../src/shared/product-route-link';
import { ProductScreenShell } from '../src/shared/product-screen-shell';

export default function ProductHomeScreen() {
  return (
    <ProductScreenShell
      subtitle="Shared product shell for web, iOS, and Android."
      contentContainerStyle={{ justifyContent: 'center', paddingTop: 24, paddingBottom: 24 }}
      testID="product-home-screen"
    >
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
        Shared domain role: {productAppShell.onboardingRoles[0]} · Initial booking state:{' '}
        {productAppShell.initialBookingStatus}
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
        Provider onboarding: {productAppShell.onboardingSteps.length} shared steps · First step:{' '}
        {productAppShell.onboardingSteps[0].label}
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
        Session: {productAppShell.sessionState} · Auth entry: {productAppShell.authEntryStep.label} · Public
        routes: {productAppShell.publicAuthRoutes.length}
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
        Session bootstrap: {productAppShell.sessionBootstrapRequest.method}{' '}
        {productAppShell.sessionBootstrapRoute}
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
        Shared auth route: /auth · Public auth actions: {productAppShell.publicAuthRoutes.join(', ')}
      </Text>
      <ProductRouteLink
        href="/auth"
        title="Open auth entry preview"
        description="Local sign-in, sign-up, recovery, and continuation stubs now live behind their own shared route."
        testID="product-home-open-auth-link"
      />
      <ProductRouteLink
        href="/marketplace-preview"
        title="Open marketplace preview"
        description="Presentation-focused post-auth preview slice for tomorrow's meeting (demo-safe and local only)."
        testID="product-home-open-marketplace-preview-link"
      />
    </ProductScreenShell>
  );
}