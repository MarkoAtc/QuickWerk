import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { submitBookingRequest } from './booking-screen-actions';
import { productAppShell } from '../../shared/app-shell';
import { resolveSessionToken, useSession } from '../../shared/session-provider';
import { ProductScreenShell } from '../../shared/product-screen-shell';

export function BookingScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [requestedService, setRequestedService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [createdBooking, setCreatedBooking] = useState(undefined);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      router.replace('/auth');
    }
  }, [session.status]);

  if (session.status !== 'authenticated') {
    return null;
  }

  const handleSubmit = () => {
    if (isSubmitting || !requestedService.trim()) {
      return;
    }

    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      setErrorMessage('Your session has expired. Please sign in again.');
      signOut();
      router.replace('/auth');
      return;
    }

    setErrorMessage(undefined);
    setIsSubmitting(true);

    submitBookingRequest({
      sessionToken,
      requestedService: requestedService.trim(),
    })
      .then((result) => {
        if (result.errorMessage) {
          setErrorMessage(result.errorMessage);
          return;
        }

        setCreatedBooking(result.booking);
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Unexpected booking failure.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleSignOut = () => {
    signOut();
    router.replace('/auth');
  };

  return (
    <ProductScreenShell
      title="Request a Service"
      subtitle="Describe what you need and submit your booking."
      testID="booking-screen"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          onPress={handleSignOut}
          testID="booking-sign-out"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#CBD5E1',
          }}
        >
          <Text style={{ color: '#64748B', fontSize: 14 }}>Sign out</Text>
        </Pressable>
      </View>

      {createdBooking ? (
        <View
          testID="booking-confirmation"
          style={{
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#BBF7D0',
            backgroundColor: '#F0FDF4',
          }}
        >
          <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 18 }}>Booking submitted ✓</Text>
          <Text testID="booking-id" style={{ marginTop: 8, color: '#166534' }}>
            ID: {createdBooking.bookingId}
          </Text>
          <Text testID="booking-service" style={{ marginTop: 4, color: '#166534' }}>
            Service: {createdBooking.requestedService}
          </Text>
          <Text testID="booking-status" style={{ marginTop: 4, color: '#166534', fontWeight: '600' }}>
            Status: {createdBooking.status}
          </Text>
          <Pressable
            accessibilityLabel="Open booking status"
            accessibilityRole="button"
            onPress={() => router.replace({ pathname: '/active-job', params: { bookingId: createdBooking.bookingId } })}
            testID="booking-open-active-job"
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: productAppShell.theme.color.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Open booking status</Text>
          </Pressable>
        </View>
      ) : (
        <View
          testID="booking-form"
          style={{
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#D7DFEA',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 6 }}>Service description</Text>
          <TextInput
            accessibilityLabel="Service description"
            multiline
            numberOfLines={3}
            onChangeText={setRequestedService}
            placeholder="Describe the service you need…"
            testID="booking-service-input"
            value={requestedService}
            style={{
              borderWidth: 1,
              borderColor: '#CBD5E1',
              borderRadius: 8,
              padding: 10,
              fontSize: 16,
              color: '#0F172A',
              backgroundColor: '#F8FAFC',
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />

          {errorMessage ? (
            <Text testID="booking-error" style={{ marginTop: 12, color: '#DC2626', fontSize: 14 }}>
              {errorMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel="Submit booking"
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting || !requestedService.trim() }}
            disabled={isSubmitting || !requestedService.trim()}
            onPress={handleSubmit}
            testID="booking-submit"
            style={{
              marginTop: 16,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor:
                isSubmitting || !requestedService.trim()
                  ? '#94A3B8'
                  : productAppShell.theme.color.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
              {isSubmitting ? 'Submitting…' : 'Submit booking'}
            </Text>
          </Pressable>
        </View>
      )}
    </ProductScreenShell>
  );
}
