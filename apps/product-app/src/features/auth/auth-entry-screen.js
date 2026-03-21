import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AuthEntrySection } from './auth-entry-section';
import { createAuthEntryState, initialAuthEntryState } from './auth-entry-state';
import { ProductRouteLink } from '../../shared/product-route-link';
import { ProductScreenShell } from '../../shared/product-screen-shell';
import { defaultSessionBootstrap, loadSessionBootstrap, signInWithSessionBootstrap } from '../../shared/session-bootstrap';

export function AuthEntryScreen() {
  const [actionStatusMessage, setActionStatusMessage] = useState();
  const [sessionBootstrap, setSessionBootstrap] = useState(defaultSessionBootstrap);
  const [sessionToken, setSessionToken] = useState();
  const [isSessionBootstrapLoading, setIsSessionBootstrapLoading] = useState(true);
  const [isSignInSubmitting, setIsSignInSubmitting] = useState(false);

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

  const handleSignInPress = () => {
    if (isSignInSubmitting) {
      return;
    }

    setActionStatusMessage(undefined);
    setIsSignInSubmitting(true);

    void signInWithSessionBootstrap()
      .then((result) => {
        setSessionBootstrap(result.sessionBootstrap);

        if (result.sessionToken) {
          setSessionToken(result.sessionToken);
        }

        if (result.errorMessage) {
          setActionStatusMessage(`Sign-in warning: ${result.errorMessage}`);
          return;
        }

        setActionStatusMessage('Live sign-in completed. Session token resolved and state is authenticated.');
      })
      .finally(() => {
        setIsSignInSubmitting(false);
      });
  };

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
        <Text testID="auth-entry-token-state" style={{ marginTop: 6, color: '#475569' }}>
          Session token: {sessionToken ? `${sessionToken.slice(0, 8)}…` : 'not issued'}
        </Text>
      </View>

      <AuthEntrySection
        authEntryState={authEntryState}
        actionStatusMessage={actionStatusMessage}
        isSubmitting={isSignInSubmitting}
        onPrimaryActionPress={handleSignInPress}
      />

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
