import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { acceptBookingRequest } from './provider-screen-actions';
import { productAppShell } from '../../shared/app-shell';
import { sessionStore } from '../../shared/session-context';
import { ProductScreenShell } from '../../shared/product-screen-shell';

export function ProviderScreen() {
  const router = useRouter();
  const session = sessionStore.get();
  const [bookingId, setBookingId] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [acceptedBooking, setAcceptedBooking] = useState(undefined);

  if (session.status !== 'authenticated') {
    router.replace('/sign-in');
    return null;
  }

  const handleAccept = () => {
    if (isAccepting || !bookingId.trim()) {
      return;
    }

    setErrorMessage(undefined);
    setIsAccepting(true);

    acceptBookingRequest({
      sessionToken: session.sessionToken,
      bookingId: bookingId.trim(),
    })
      .then((result) => {
        if (result.errorMessage) {
          setErrorMessage(result.errorMessage);
          return;
        }

        setAcceptedBooking(result.booking);
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Unexpected accept failure.');
      })
      .finally(() => {
        setIsAccepting(false);
      });
  };

  const handleSignOut = () => {
    sessionStore.clear();
    router.replace('/sign-in');
  };

  const handleReset = () => {
    setAcceptedBooking(undefined);
    setBookingId('');
    setErrorMessage(undefined);
  };

  return (
    <ProductScreenShell
      title="Provider: Accept Booking"
      subtitle="Enter a booking ID to accept it and update its status."
      testID="provider-screen"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          onPress={handleSignOut}
          testID="provider-sign-out"
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

      {acceptedBooking ? (
        <View
          testID="provider-accept-confirmation"
          style={{
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#BBF7D0',
            backgroundColor: '#F0FDF4',
          }}
        >
          <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 18 }}>Booking accepted ✓</Text>
          <Text testID="provider-booking-id" style={{ marginTop: 8, color: '#166534' }}>
            ID: {acceptedBooking.bookingId}
          </Text>
          <Text testID="provider-booking-status" style={{ marginTop: 4, color: '#166534', fontWeight: '600' }}>
            Status: {acceptedBooking.status}
          </Text>
          {acceptedBooking.requestedService ? (
            <Text testID="provider-booking-service" style={{ marginTop: 4, color: '#166534' }}>
              Service: {acceptedBooking.requestedService}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel="Accept another booking"
            accessibilityRole="button"
            onPress={handleReset}
            testID="provider-accept-another"
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#15803D',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#15803D', fontWeight: '600' }}>Accept another booking</Text>
          </Pressable>
        </View>
      ) : (
        <View
          testID="provider-accept-form"
          style={{
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#D7DFEA',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 6 }}>Booking ID</Text>
          <TextInput
            accessibilityLabel="Booking ID"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setBookingId}
            placeholder="e.g. booking-abc123"
            testID="provider-booking-id-input"
            value={bookingId}
            style={{
              borderWidth: 1,
              borderColor: '#CBD5E1',
              borderRadius: 8,
              padding: 10,
              fontSize: 16,
              color: '#0F172A',
              backgroundColor: '#F8FAFC',
            }}
          />

          {errorMessage ? (
            <Text testID="provider-error" style={{ marginTop: 12, color: '#DC2626', fontSize: 14 }}>
              {errorMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel="Accept booking"
            accessibilityRole="button"
            accessibilityState={{ disabled: isAccepting || !bookingId.trim() }}
            disabled={isAccepting || !bookingId.trim()}
            onPress={handleAccept}
            testID="provider-accept-submit"
            style={{
              marginTop: 16,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor:
                isAccepting || !bookingId.trim()
                  ? '#94A3B8'
                  : productAppShell.theme.color.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
              {isAccepting ? 'Accepting…' : 'Accept booking'}
            </Text>
          </Pressable>
        </View>
      )}
    </ProductScreenShell>
  );
}
