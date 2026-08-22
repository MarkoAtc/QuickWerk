import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { CheckoutScreen } from '../src/features/booking/checkout-screen';
import { resolveBookingIdParam } from '../src/features/booking/active-job-route-state';
import {
  addPaymentMethodForCheckout,
  loadCheckoutData,
  submitCheckout,
} from '../src/features/booking/checkout-screen-actions';
import { productAppShell } from '../src/shared/app-shell';
import { ProductScreenShell } from '../src/shared/product-screen-shell';
import { resolveSessionToken, useSession } from '../src/shared/session-provider';

export default function CheckoutRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session, signOut } = useSession();
  const [screenState, setScreenState] = useState({ status: 'loading' });
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [needsReload, setNeedsReload] = useState(false);

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
    setNeedsReload(false);
    setErrorMessage(undefined);

    loadCheckoutData({ sessionToken, bookingId }).then((result) => {
      if (result.status === 'handoff') {
        router.replace({ pathname: `/${result.target}`, params: { bookingId } });
        return;
      }

      if (result.status === 'error') {
        setScreenState({ status: 'error', errorMessage: result.message });
        return;
      }

      setScreenState({ status: 'loaded', ...result });
      setSelectedPaymentMethodId(result.paymentMethods[0]?.paymentMethodId ?? null);
    }).catch((error) => {
      setScreenState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'An unexpected error occurred while loading checkout.',
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

  if (!bookingId) {
    return (
      <ProductScreenShell title="Checkout" subtitle="Missing booking id." testID="checkout-error">
        <Text style={{ color: '#B91C1C' }}>No booking was specified for checkout.</Text>
      </ProductScreenShell>
    );
  }

  if (screenState.status === 'loading') {
    return (
      <ProductScreenShell title="Checkout" subtitle="Loading your order details." testID="checkout-loading">
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator color={productAppShell.theme.color.primary} size="small" />
          <Text style={{ marginTop: 8, color: '#64748B' }}>Loading checkout…</Text>
        </View>
      </ProductScreenShell>
    );
  }

  if (screenState.status === 'error') {
    return (
      <ProductScreenShell title="Checkout" subtitle="Could not load checkout details." testID="checkout-load-error">
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 }}>
          <Text style={{ color: '#B91C1C' }}>{screenState.errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading checkout"
            onPress={load}
            testID="checkout-retry"
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      </ProductScreenShell>
    );
  }

  const sessionToken = resolveSessionToken(session);

  const handleAddCard = () => {
    setIsAddingCard(true);
    setErrorMessage(undefined);

    addPaymentMethodForCheckout(sessionToken).then((result) => {
      setIsAddingCard(false);

      if (result.status === 'error') {
        setErrorMessage(result.message);
        return;
      }

      setScreenState((current) => ({
        ...current,
        paymentMethods: [result.paymentMethod, ...current.paymentMethods],
      }));
      setSelectedPaymentMethodId(result.paymentMethod.paymentMethodId);
    });
  };

  const handleSubmit = () => {
    if (!selectedPaymentMethodId) return;

    setIsSubmitting(true);
    setErrorMessage(undefined);

    submitCheckout({
      sessionToken,
      bookingId,
      quoteId: screenState.quote.quoteId,
      paymentMethodId: selectedPaymentMethodId,
    }).then((result) => {
      setIsSubmitting(false);

      if (result.status === 'success') {
        router.replace({ pathname: '/active-job', params: { bookingId } });
        return;
      }

      if (result.status === 'needs-reload') {
        setNeedsReload(true);
        return;
      }

      setErrorMessage(result.message);
    });
  };

  return (
    <CheckoutScreen
      requestedService={screenState.requestedService}
      quote={screenState.quote}
      paymentMethods={screenState.paymentMethods}
      selectedPaymentMethodId={selectedPaymentMethodId}
      onSelectPaymentMethod={setSelectedPaymentMethodId}
      onAddCard={handleAddCard}
      isAddingCard={isAddingCard}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      needsReload={needsReload}
      onRetryAfterReload={load}
      onBack={() => router.back()}
    />
  );
}
