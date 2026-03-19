import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AuthEntrySection } from './auth-entry-section';
import { createAuthEntryState, initialAuthEntryState } from './auth-entry-state';
import { productAppShell } from '../../shared/app-shell';
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
      subtitle="A polished shared auth entry for client demos — sign in, create account, or recover access in one clean flow."
      testID="auth-entry-screen"
      contentContainerStyle={{ maxWidth: 920, alignSelf: 'center', width: '100%' }}
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
          Session bootstrap: {productAppShell.sessionBootstrapRequest.method} {productAppShell.sessionBootstrapRoute}
        </Text>
        <Text style={{ marginTop: 6, color: '#334155' }}>
          Current state: {authEntryState.sessionState} · Primary action: {authEntryState.primaryActionLabel}
        </Text>
      </View>

      <AuthEntrySection authEntryState={authEntryState} />

      {authEntryState.primaryActionId === 'continue-to-marketplace' ? (
        <ProductRouteLink
          href="/marketplace-preview"
          title="Continue to marketplace preview"
          description="Open the client-facing post-auth marketplace surface."
          testID="auth-entry-open-marketplace-preview-link"
        />
      ) : null}

      <ProductRouteLink
        href="/"
        title="Back to product home"
        variant="outline"
        accessibilityHint="Returns to the shared product home route."
        testID="auth-entry-back-home-link"
      />
    </ProductScreenShell>
  );
}
