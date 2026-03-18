import { useEffect, useState } from 'react';
import { Text } from 'react-native';

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
      title="Shared auth entry"
      subtitle="Local sign-in, sign-up, and recovery route for the shared product app shell."
      testID="auth-entry-screen"
    >
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
        Session bootstrap: {productAppShell.sessionBootstrapRequest.method} {productAppShell.sessionBootstrapRoute}
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
        Primary action: {authEntryState.primaryActionLabel} · Session: {authEntryState.sessionState}
      </Text>
      <AuthEntrySection authEntryState={authEntryState} />
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