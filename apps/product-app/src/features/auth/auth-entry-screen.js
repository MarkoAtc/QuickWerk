import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AuthEntrySection } from './auth-entry-section';
import { createAuthEntryState, initialAuthEntryState } from './auth-entry-state';
import { ProductRouteLink } from '../../shared/product-route-link';
import { ProductScreenShell } from '../../shared/product-screen-shell';
import { defaultSessionBootstrap, loadSessionBootstrap } from '../../shared/session-bootstrap';

export function AuthEntryScreen() {
  const [sessionBootstrap, setSessionBootstrap] = useState(defaultSessionBootstrap);
  const [isSessionBootstrapLoading, setIsSessionBootstrapLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void loadSessionBootstrap()
      .then((nextSessionBootstrap) => {
        if (isMounted) {
          setSessionBootstrap(nextSessionBootstrap);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsSessionBootstrapLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const authEntryState = isSessionBootstrapLoading
    ? initialAuthEntryState
    : createAuthEntryState(sessionBootstrap, isSessionBootstrapLoading);

  return (
    <ProductScreenShell
      title="Welcome to QuickWerk"
      subtitle="Sign in, create your account, or recover access in one clear mobile-first flow."
      testID="auth-entry-screen"
      contentContainerStyle={{ maxWidth: 920, alignSelf: 'center', width: '100%' }}
    >
      <View
        style={{
          marginTop: 6,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#D7DFEA',
          backgroundColor: '#FFFFFF',
          padding: 16,
        }}
      >
        <Text style={{ color: '#12305C', fontWeight: '700' }}>Customer entry point</Text>
        <Text style={{ marginTop: 6, color: '#334155' }}>
          This demo shows the first moments of the customer journey before entering provider discovery.
        </Text>
      </View>

      <AuthEntrySection authEntryState={authEntryState} />

      {authEntryState.primaryActionId === 'continue-to-marketplace' ? (
        <ProductRouteLink
          href="/marketplace-preview"
          title="Continue to marketplace"
          description="Move into the provider discovery and booking walkthrough."
          testID="auth-entry-open-marketplace-preview-link"
        />
      ) : null}

      <ProductRouteLink
        href="/"
        title="Back to demo overview"
        variant="outline"
        accessibilityHint="Returns to the QuickWerk demo overview screen."
        testID="auth-entry-back-home-link"
      />
    </ProductScreenShell>
  );
}
