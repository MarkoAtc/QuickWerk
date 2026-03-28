import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { acceptBookingRequest, listBookingsRequest } from './provider-screen-actions';
import { productAppShell } from '../../shared/app-shell';
import { resolveSessionToken, useSession } from '../../shared/session-provider';
import { ProductScreenShell } from '../../shared/product-screen-shell';

export function ProviderScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();

  const [bookings, setBookings] = useState(undefined);
  const [listError, setListError] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const [acceptingId, setAcceptingId] = useState(undefined);
  const [acceptError, setAcceptError] = useState(undefined);
  const [acceptedBooking, setAcceptedBooking] = useState(undefined);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      router.replace('/auth');
    }
  }, [session.status]);

  if (session.status !== 'authenticated') {
    return null;
  }

  const loadOpenBookings = () => {
    if (isLoading) return;

    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      setListError('Your session has expired. Please sign in again.');
      signOut();
      router.replace('/auth');
      return;
    }

    setListError(undefined);
    setIsLoading(true);

    listBookingsRequest(sessionToken)
      .then((result) => {
        if (result.errorMessage) {
          setListError(result.errorMessage);
          return;
        }
        setBookings(result.bookings);
      })
      .catch((err) => {
        setListError(err instanceof Error ? err.message : 'Unexpected error loading bookings.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Load on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadOpenBookings(); }, []);

  const handleAccept = (bookingId) => {
    if (acceptingId) return;

    setAcceptError(undefined);
    setAcceptingId(bookingId);

    const sessionToken = resolveSessionToken(session);

    if (!sessionToken) {
      setAcceptError('Your session has expired. Please sign in again.');
      setAcceptingId(undefined);
      signOut();
      router.replace('/auth');
      return;
    }

    acceptBookingRequest({ sessionToken, bookingId })
      .then((result) => {
        if (result.errorMessage) {
          setAcceptError(result.errorMessage);
          return;
        }
        setAcceptedBooking(result.booking);
        // Remove from list immediately
        setBookings((prev) => prev ? prev.filter((b) => b.bookingId !== bookingId) : prev);
      })
      .catch((err) => {
        setAcceptError(err instanceof Error ? err.message : 'Unexpected accept failure.');
      })
      .finally(() => {
        setAcceptingId(undefined);
      });
  };

  const handleSignOut = () => {
    signOut();
    router.replace('/auth');
  };

  const handleReset = () => {
    setAcceptedBooking(undefined);
    setAcceptError(undefined);
    loadOpenBookings();
  };

  return (
    <ProductScreenShell
      title="Provider: Open Bookings"
      subtitle="Browse submitted bookings and accept one to get started."
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
        <View testID="provider-bookings-list">
          {isLoading ? (
            <View testID="provider-bookings-loading" style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="small" color={productAppShell.theme.color.primary} />
              <Text style={{ marginTop: 8, color: '#64748B' }}>Loading open bookings…</Text>
            </View>
          ) : listError ? (
            <View testID="provider-list-error" style={{ padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}>
              <Text style={{ color: '#DC2626', fontSize: 14 }}>{listError}</Text>
              <Pressable
                accessibilityLabel="Retry loading bookings"
                accessibilityRole="button"
                onPress={loadOpenBookings}
                testID="provider-list-retry"
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: '#DC2626', fontWeight: '600' }}>Retry</Text>
              </Pressable>
            </View>
          ) : bookings && bookings.length === 0 ? (
            <View testID="provider-bookings-empty" style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: '#94A3B8', fontSize: 15 }}>No open bookings right now.</Text>
              <Pressable
                accessibilityLabel="Refresh bookings"
                accessibilityRole="button"
                onPress={loadOpenBookings}
                testID="provider-list-refresh"
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '600' }}>Refresh</Text>
              </Pressable>
            </View>
          ) : bookings ? (
            <ScrollView>
              {acceptError ? (
                <Text testID="provider-error" style={{ marginBottom: 8, color: '#DC2626', fontSize: 14 }}>
                  {acceptError}
                </Text>
              ) : null}
              {bookings.map((booking) => (
                <View
                  key={booking.bookingId}
                  testID={`provider-booking-row-${booking.bookingId}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#D7DFEA',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      testID={`provider-booking-service-${booking.bookingId}`}
                      style={{ color: '#0F172A', fontWeight: '600', fontSize: 15 }}
                      numberOfLines={2}
                    >
                      {booking.requestedService}
                    </Text>
                    <Text
                      testID={`provider-booking-id-label-${booking.bookingId}`}
                      style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}
                    >
                      ID: {booking.bookingId}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={acceptingId === booking.bookingId ? `Accepting booking ${booking.bookingId}` : `Accept booking ${booking.bookingId}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !!acceptingId, busy: acceptingId === booking.bookingId }}
                    disabled={!!acceptingId}
                    onPress={() => handleAccept(booking.bookingId)}
                    testID={`provider-accept-${booking.bookingId}`}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: acceptingId === booking.bookingId
                        ? '#94A3B8'
                        : productAppShell.theme.color.primary,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                      {acceptingId === booking.bookingId ? 'Accepting…' : 'Accept'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      )}
    </ProductScreenShell>
  );
}
