import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { declineBookingRequest } from '../booking/booking-screen-actions';
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
  const [decliningId, setDecliningId] = useState(undefined);
  const [bookingDraftReasons, setBookingDraftReasons] = useState({});
  const [mutationError, setMutationError] = useState(undefined);
  const [acceptedBooking, setAcceptedBooking] = useState(undefined);
  const [declinedBooking, setDeclinedBooking] = useState(undefined);

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

  const updateBookingDraftReason = (bookingId, value) => {
    setBookingDraftReasons((prev) => ({ ...prev, [bookingId]: value }));
  };

  const clearMutationFeedback = () => {
    setAcceptedBooking(undefined);
    setDeclinedBooking(undefined);
    setMutationError(undefined);
  };

  const handleAccept = (bookingId) => {
    if (acceptingId || decliningId) return;

    clearMutationFeedback();
    setAcceptingId(bookingId);

    const sessionToken = resolveSessionToken(session);

    if (!sessionToken) {
      setMutationError('Your session has expired. Please sign in again.');
      setAcceptingId(undefined);
      signOut();
      router.replace('/auth');
      return;
    }

    acceptBookingRequest({ sessionToken, bookingId })
      .then((result) => {
        if (result.errorMessage) {
          setMutationError(result.errorMessage);
          return;
        }
        setAcceptedBooking(result.booking);
        setBookings((prev) => prev ? prev.filter((b) => b.bookingId !== bookingId) : prev);
      })
      .catch((err) => {
        setMutationError(err instanceof Error ? err.message : 'Unexpected accept failure.');
      })
      .finally(() => {
        setAcceptingId(undefined);
      });
  };

  const handleDecline = (bookingId) => {
    if (acceptingId || decliningId) return;

    clearMutationFeedback();
    setDecliningId(bookingId);

    const sessionToken = resolveSessionToken(session);
    const declineReason = bookingDraftReasons[bookingId]?.trim();

    if (!sessionToken) {
      setMutationError('Your session has expired. Please sign in again.');
      setDecliningId(undefined);
      signOut();
      router.replace('/auth');
      return;
    }

    declineBookingRequest({
      sessionToken,
      bookingId,
      declineReason: declineReason || undefined,
    })
      .then((result) => {
        if (result.errorMessage) {
          setMutationError(result.errorMessage);
          return;
        }
        setDeclinedBooking(result.booking);
        setBookings((prev) => prev ? prev.filter((b) => b.bookingId !== bookingId) : prev);
        setBookingDraftReasons((prev) => {
          const next = { ...prev };
          delete next[bookingId];
          return next;
        });
      })
      .catch((err) => {
        setMutationError(err instanceof Error ? err.message : 'Unexpected decline failure.');
      })
      .finally(() => {
        setDecliningId(undefined);
      });
  };

  const handleSignOut = () => {
    signOut();
    router.replace('/auth');
  };

  const handleReset = () => {
    clearMutationFeedback();
    loadOpenBookings();
  };

  return (
    <ProductScreenShell
      title="Provider: Open Bookings"
      subtitle="Browse submitted bookings and accept or decline them with an optional reason."
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

      {acceptedBooking || declinedBooking ? (
        <View
          testID={acceptedBooking ? 'provider-accept-confirmation' : 'provider-decline-confirmation'}
          style={{
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: acceptedBooking ? '#BBF7D0' : '#FDE68A',
            backgroundColor: acceptedBooking ? '#F0FDF4' : '#FFFBEB',
          }}
        >
          <Text
            style={{
              color: acceptedBooking ? '#15803D' : '#B45309',
              fontWeight: '700',
              fontSize: 18,
            }}
          >
            {acceptedBooking ? 'Booking accepted ✓' : 'Booking declined ✓'}
          </Text>
          <Text testID="provider-booking-id" style={{ marginTop: 8, color: acceptedBooking ? '#166534' : '#92400E' }}>
            ID: {(acceptedBooking ?? declinedBooking).bookingId}
          </Text>
          <Text
            testID="provider-booking-status"
            style={{ marginTop: 4, color: acceptedBooking ? '#166534' : '#92400E', fontWeight: '600' }}
          >
            Status: {(acceptedBooking ?? declinedBooking).status}
          </Text>
          {(acceptedBooking ?? declinedBooking).requestedService ? (
            <Text testID="provider-booking-service" style={{ marginTop: 4, color: acceptedBooking ? '#166534' : '#92400E' }}>
              Service: {(acceptedBooking ?? declinedBooking).requestedService}
            </Text>
          ) : null}
          {declinedBooking?.declineReason ? (
            <Text testID="provider-booking-decline-reason" style={{ marginTop: 4, color: '#92400E' }}>
              Reason: {declinedBooking.declineReason}
            </Text>
          ) : null}
          {acceptedBooking ? (
            <Pressable
              accessibilityLabel="Open booking status"
              accessibilityRole="button"
              onPress={() => router.replace({ pathname: '/active-job', params: { bookingId: acceptedBooking.bookingId } })}
              testID="provider-open-booking-status"
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
          ) : null}
          <Pressable
            accessibilityLabel={acceptedBooking ? 'Accept another booking' : 'Review more bookings'}
            accessibilityRole="button"
            onPress={handleReset}
            testID={acceptedBooking ? 'provider-accept-another' : 'provider-decline-another'}
            style={{
              marginTop: 8,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: acceptedBooking ? '#15803D' : '#B45309',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: acceptedBooking ? '#15803D' : '#B45309', fontWeight: '600' }}>
              {acceptedBooking ? 'Accept another booking' : 'Review more bookings'}
            </Text>
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
              {mutationError ? (
                <Text testID="provider-error" style={{ marginBottom: 8, color: '#DC2626', fontSize: 14 }}>
                  {mutationError}
                </Text>
              ) : null}
              {bookings.map((booking) => {
                const isAccepting = acceptingId === booking.bookingId;
                const isDeclining = decliningId === booking.bookingId;
                const isBusy = Boolean(acceptingId || decliningId);
                const declineReasonDraft = bookingDraftReasons[booking.bookingId] ?? '';

                return (
                  <View
                    key={booking.bookingId}
                    testID={`provider-booking-row-${booking.bookingId}`}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#D7DFEA',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
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
                    <TextInput
                      accessibilityLabel={`Optional decline reason for booking ${booking.bookingId}`}
                      editable={!isBusy}
                      multiline
                      onChangeText={(value) => updateBookingDraftReason(booking.bookingId, value)}
                      placeholder="Optional decline reason"
                      placeholderTextColor="#94A3B8"
                      style={{
                        marginTop: 10,
                        minHeight: 44,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: '#0F172A',
                        backgroundColor: isBusy ? '#F8FAFC' : '#FFFFFF',
                      }}
                      testID={`provider-decline-reason-${booking.bookingId}`}
                      value={declineReasonDraft}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <Pressable
                        accessibilityLabel={isAccepting ? `Accepting booking ${booking.bookingId}` : `Accept booking ${booking.bookingId}`}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isBusy, busy: isAccepting }}
                        disabled={isBusy}
                        onPress={() => handleAccept(booking.bookingId)}
                        testID={`provider-accept-${booking.bookingId}`}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: isAccepting ? '#94A3B8' : productAppShell.theme.color.primary,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                          {isAccepting ? 'Accepting…' : 'Accept'}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={isDeclining ? `Declining booking ${booking.bookingId}` : `Decline booking ${booking.bookingId}`}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isBusy, busy: isDeclining }}
                        disabled={isBusy}
                        onPress={() => handleDecline(booking.bookingId)}
                        testID={`provider-decline-${booking.bookingId}`}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: isDeclining ? '#FBBF24' : '#F59E0B',
                          backgroundColor: isDeclining ? '#FEF3C7' : '#FFF7ED',
                        }}
                      >
                        <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 14 }}>
                          {isDeclining ? 'Declining…' : 'Decline'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      )}
    </ProductScreenShell>
  );
}
