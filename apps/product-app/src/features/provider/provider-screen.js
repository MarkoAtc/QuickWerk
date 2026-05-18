import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

import { loadOnboardingStatus } from './onboarding-screen-actions';
import {
  isProviderBookingAccessApproved,
  resolveProviderBookingGateMessage,
} from './provider-onboarding-workspace-state';
import { acceptBookingRequest, listBookingsRequest } from './provider-screen-actions';
import { resolveSessionToken, useSession } from '../../shared/session-provider';

function StatusBadge({ text, tone = 'default' }) {
  const styles =
    tone === 'warning'
      ? { backgroundColor: 'rgba(255, 138, 0, 0.14)', color: colors.cta }
      : tone === 'success'
        ? { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#047857' }
        : { backgroundColor: colors.surfaceContainer, color: colors.textMuted };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: styles.backgroundColor,
      }}
    >
      <Text
        style={{
          color: styles.color,
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function MetricCard({ label, value, accent = colors.secondaryBright }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 24,
        padding: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <Text
        style={{
          color: colors.onPrimaryContainer,
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: spacing.sm,
          color: accent,
          fontSize: 32,
          lineHeight: 36,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function BookingShowcaseCard({ booking, onAccept, isAccepting }) {
  return (
    <View
      testID={`provider-booking-row-${booking.bookingId}`}
      style={{
        borderRadius: 32,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 32,
              lineHeight: 36,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: -0.4,
            }}
            testID={`provider-booking-service-${booking.bookingId}`}
          >
            {booking.requestedService}
          </Text>
          <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
            {booking.locationSummary}
          </Text>
        </View>

        <View
          style={{
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: 'rgba(2,102,255,0.10)',
          }}
        >
          <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
            {booking.urgencyLabel}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Budget
          </Text>
          <Text style={{ marginTop: spacing.sm, color: colors.text, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold }}>
            {booking.budgetSummary}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Requested by
          </Text>
          <Text style={{ marginTop: spacing.sm, color: colors.text, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold }}>
            {booking.requesterLabel}
          </Text>
        </View>
      </View>

      <Text style={{ marginTop: spacing.xl, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
        {booking.scopeSummary}
      </Text>

      <Pressable accessibilityRole="button" onPress={() => onAccept(booking.bookingId)} disabled={isAccepting} testID={`provider-booking-accept-${booking.bookingId}`}>
        <View style={{ ...componentStyles.button.primary, marginTop: spacing.xl, opacity: isAccepting ? 0.7 : 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
            {isAccepting ? 'Accepting…' : 'Accept booking request'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export function ProviderScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();

  const [accessGateStatus, setAccessGateStatus] = useState('checking');
  const [accessGateMessage, setAccessGateMessage] = useState();
  const [bookings, setBookings] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState();
  const [acceptingId, setAcceptingId] = useState();
  const [acceptError, setAcceptError] = useState();
  const [acceptedBooking, setAcceptedBooking] = useState();

  const loadOpenBookings = () => {
    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      setListError('Your session has expired. Please sign in again.');
      signOut();
      router.replace('/auth');
      return;
    }

    setIsLoading(true);
    setListError(undefined);

    listBookingsRequest({ sessionToken })
      .then((result) => {
        if (result.errorMessage) {
          setListError(result.errorMessage);
          return;
        }

        setBookings(result.bookings);
      })
      .catch((err) => {
        setListError(err instanceof Error ? err.message : 'Unexpected provider bookings error.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const checkBookingAccess = () => {
    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      setListError('Your session has expired. Please sign in again.');
      signOut();
      router.replace('/auth');
      return;
    }

    setAccessGateStatus('checking');
    setAccessGateMessage(undefined);
    setListError(undefined);

    loadOnboardingStatus(sessionToken)
      .then((onboardingState) => {
        if (isProviderBookingAccessApproved(onboardingState)) {
          setAccessGateStatus('approved');
          return;
        }

        setAccessGateStatus('blocked');
        setAccessGateMessage(
          resolveProviderBookingGateMessage(onboardingState) ?? 'Complete onboarding to unlock bookings.',
        );
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Unexpected verification status error.';
        setAccessGateStatus('error');
        setAccessGateMessage(message);
        setListError(message);
      });
  };

  useEffect(() => {
    checkBookingAccess();
  }, []);

  useEffect(() => {
    if (accessGateStatus === 'approved') {
      loadOpenBookings();
    }
  }, [accessGateStatus]);

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
        setBookings((previous) => (previous ? previous.filter((entry) => entry.bookingId !== bookingId) : previous));
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
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        gap: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="provider-screen"
    >
      <View
        style={{
          borderRadius: 36,
          padding: spacing.xl,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
      >
        <StatusBadge text={accessGateStatus === 'approved' ? 'Verified access' : 'Review required'} tone={accessGateStatus === 'approved' ? 'success' : 'warning'} />

        <Text
          style={{
            marginTop: spacing.lg,
            color: '#FFFFFF',
            fontSize: 48,
            lineHeight: 52,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: -1,
            maxWidth: 760,
          }}
        >
          Provider workspace built to impress before the backend is even fully finished.
        </Text>
        <Text
          style={{
            marginTop: spacing.md,
            color: colors.onPrimaryContainer,
            fontSize: typography.fontSize.bodyLg,
            lineHeight: typography.lineHeight.bodyLg,
            maxWidth: 720,
          }}
        >
          This area should feel like a premium provider cockpit. It needs to communicate demand, readiness, trust, and next actions in seconds.
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          <MetricCard label="Open requests" value={bookings ? String(bookings.length) : '—'} />
          <MetricCard label="Access" value={accessGateStatus === 'approved' ? 'Live' : 'Blocked'} accent={accessGateStatus === 'approved' ? colors.success : colors.cta} />
          <MetricCard label="Profile" value={acceptedBooking ? 'Active' : 'Draft'} accent={colors.warning} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/provider-onboarding')} testID="provider-open-onboarding" style={{ flex: 1 }}>
          <View style={{ ...componentStyles.button.dark, minHeight: 60 }}>
            <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              Manage profile & verification
            </Text>
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={handleSignOut} testID="provider-sign-out" style={{ width: 180 }}>
          <View style={{ ...componentStyles.button.ghost, minHeight: 60 }}>
            <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              Sign out
            </Text>
          </View>
        </Pressable>
      </View>

      {accessGateStatus !== 'approved' ? (
        <View
          style={{
            borderRadius: 28,
            padding: spacing.xl,
            backgroundColor: '#FFF7ED',
            borderWidth: 1,
            borderColor: '#FED7AA',
          }}
          testID="provider-booking-access-gated"
        >
          <Text style={{ color: '#C2410C', fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold }}>
            Booking access is currently gated.
          </Text>
          {accessGateMessage ? (
            <Text style={{ marginTop: spacing.sm, color: '#9A3412', fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
              {accessGateMessage}
            </Text>
          ) : null}
        </View>
      ) : null}

      {acceptedBooking ? (
        <View
          style={{
            borderRadius: 32,
            padding: spacing.xl,
            backgroundColor: '#ECFDF5',
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}
          testID="provider-accept-confirmation"
        >
          <Text style={{ color: '#15803D', fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
            Booking accepted ✓
          </Text>
          <Text style={{ marginTop: spacing.sm, color: '#166534', fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
            {acceptedBooking.requestedService} is now part of your active pipeline.
          </Text>
          <Pressable accessibilityRole="button" onPress={handleReset} style={{ marginTop: spacing.lg }}>
            <View style={{ ...componentStyles.button.dark }}>
              <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
                Back to open requests
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      <View>
        <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
          Open demand
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd, maxWidth: 760 }}>
          Even as a showcase UI, this screen should instantly communicate that providers can evaluate serious work and take action with confidence.
        </Text>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.secondaryBright} size="small" />
          <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>Loading booking opportunities…</Text>
        </View>
      ) : null}

      {acceptError ? (
        <View
          style={{
            borderRadius: 24,
            padding: spacing.lg,
            backgroundColor: colors.errorContainer,
            borderWidth: 1,
            borderColor: '#FECACA',
          }}
        >
          <Text style={{ color: colors.onErrorContainer, fontWeight: typography.fontWeight.bold }}>{acceptError}</Text>
        </View>
      ) : null}

      {listError ? (
        <View
          style={{
            borderRadius: 24,
            padding: spacing.lg,
            backgroundColor: colors.errorContainer,
            borderWidth: 1,
            borderColor: '#FECACA',
          }}
        >
          <Text style={{ color: colors.onErrorContainer, fontWeight: typography.fontWeight.bold }}>{listError}</Text>
        </View>
      ) : null}

      {bookings && bookings.length > 0 ? (
        <View style={{ gap: spacing.lg }}>
          {bookings.map((booking) => (
            <BookingShowcaseCard
              key={booking.bookingId}
              booking={booking}
              onAccept={handleAccept}
              isAccepting={acceptingId === booking.bookingId}
            />
          ))}
        </View>
      ) : !isLoading && accessGateStatus === 'approved' ? (
        <View
          style={{
            borderRadius: 32,
            padding: spacing.xl,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            alignItems: 'center',
            ...shadow.card,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
            No live booking requests right now.
          </Text>
          <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd, maxWidth: 680, textAlign: 'center' }}>
            That is okay for the demo. This empty state is now visually strong enough to still feel like a real product, not a missing feature.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export default ProviderScreen;
