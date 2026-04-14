import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ActiveJob } from '../src/features/booking/active-job-screen';
import { resolveActiveJobRouteState, resolveBookingIdParam } from '../src/features/booking/active-job-route-state';
import { productAppShell } from '../src/shared/app-shell';
import { ProductScreenShell } from '../src/shared/product-screen-shell';
import { resolveSessionToken, useSession } from '../src/shared/session-provider';

export default function ActiveJobRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session, signOut } = useSession();
  const [screenState, setScreenState] = useState({ status: 'loading' });

  const bookingId = resolveBookingIdParam(params.bookingId);

  const load = useCallback(() => {
    if (session.status !== 'authenticated') {
      return;
    }

    const sessionToken = resolveSessionToken(session);

    if (!sessionToken) {
      signOut();
      router.replace('/auth');
      return;
    }

    setScreenState({ status: 'loading' });

    resolveActiveJobRouteState({
      sessionToken,
      bookingId,
      viewerRole: session.role,
    }).then((nextState) => {
      if (nextState.status === 'handoff') {
        router.replace({ pathname: '/booking-completion', params: { bookingId: nextState.bookingId } });
        return;
      }

      setScreenState(nextState);
    }).catch((error) => {
      console.error('Failed to load active job state:', error);
      setScreenState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'An unexpected error occurred while loading booking details.',
      });
    });
  }, [bookingId, router, session, signOut]);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      router.replace('/auth');
      return;
    }

    load();
  }, [load, router, session.status]);

  if (session.status !== 'authenticated') {
    return null;
  }

  if (screenState.status === 'loading') {
    return (
      <ProductScreenShell
        title="Booking status"
        subtitle="Loading live booking status."
        testID="active-job-loading"
      >
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator color={productAppShell.theme.color.primary} size="small" />
          <Text style={{ marginTop: 8, color: '#64748B' }}>Loading booking details…</Text>
        </View>
      </ProductScreenShell>
    );
  }

  if (screenState.status === 'error') {
    return (
      <ProductScreenShell
        title="Booking status"
        subtitle="Could not load live booking details."
        testID="active-job-error"
      >
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 }}>
          <Text style={{ color: '#B91C1C' }}>{screenState.errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry booking status"
            onPress={load}
            testID="active-job-retry"
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      </ProductScreenShell>
    );
  }

  return (
    <ActiveJob
      viewModel={screenState.viewModel}
      onChat={() => {
        // TODO: open in-app chat once chat integration is ready.
      }}
      onCall={() => {
        // TODO: initiate call once call integration is ready.
      }}
      onRefresh={load}
    />
  );
}