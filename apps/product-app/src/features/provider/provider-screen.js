import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

import {
  formatProviderRequestTimestamp,
  getProviderDisplayName,
  getProviderInitial,
  getProviderProfileLabel,
} from './provider-dashboard-presenter';
import {
  acceptBookingRequest,
  declineProviderBookingRequest,
  loadProviderDashboardData,
} from './provider-screen-actions';
import { deriveProviderLayout } from '../../shared/provider-layout';
import { resolveSessionToken, useSession } from '../../shared/session-provider';
import { useResponsiveLayout } from '../../shared/use-responsive-layout';

const initialDashboardState = { status: 'loading', profile: null };
const initialActionState = { status: 'idle' };

function ProviderAvatar({ profile }) {
  if (profile?.photoUrl) {
    return (
      <Image
        accessibilityLabel={`${getProviderDisplayName(profile)} profile photo`}
        source={{ uri: profile.photoUrl }}
        style={{
          backgroundColor: colors.surfaceContainerHigh,
          borderColor: colors.secondaryBright,
          borderRadius: radius.full,
          borderWidth: 2,
          height: 44,
          width: 44,
        }}
      />
    );
  }

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.primaryContainer,
        borderColor: colors.secondaryBright,
        borderRadius: radius.full,
        borderWidth: 2,
        height: 44,
        justifyContent: 'center',
        width: 44,
      }}
    >
      <Text style={{ color: colors.textInverse, fontSize: 17, fontWeight: typography.fontWeight.bold }}>
        {getProviderInitial(profile)}
      </Text>
    </View>
  );
}

function DashboardHeader({ layout, profile, onOpenProfile, topInset }) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.glassStrong,
        borderBottomColor: colors.outlineVariant,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: layout.contentGutter,
        paddingBottom: spacing.md,
        paddingTop: topInset + spacing.md,
        ...shadow.card,
      }}
    >
      <Pressable
        accessibilityLabel="Manage provider profile"
        accessibilityRole="button"
        onPress={onOpenProfile}
        style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }}
        testID="provider-open-onboarding-header"
      >
        <Text style={{ color: colors.text, fontSize: 26 }}>☰</Text>
      </Pressable>

      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: typography.fontWeight.bold, letterSpacing: -0.4 }}>
          Handwerker
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelSm }} numberOfLines={1}>
          {getProviderDisplayName(profile)}
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Open provider profile"
        accessibilityRole="button"
        onPress={onOpenProfile}
        testID="provider-profile-avatar"
      >
        <ProviderAvatar profile={profile} />
      </Pressable>
    </View>
  );
}

function MetricCard({ eyebrow, value, detail, tone = 'light', badge }) {
  const dark = tone === 'dark';
  const accent = tone === 'accent';
  const backgroundColor = dark
    ? colors.primaryContainer
    : accent
      ? 'rgba(2, 102, 255, 0.08)'
      : colors.surface;
  const valueColor = dark ? colors.textInverse : colors.text;
  const detailColor = dark ? colors.onPrimaryContainer : colors.textMuted;

  return (
    <View
      style={{
        backgroundColor,
        borderColor: dark ? colors.primaryContainer : colors.outlineVariant,
        borderRadius: radius.lg,
        borderWidth: 1,
        minHeight: 128,
        overflow: 'hidden',
        padding: spacing.lg,
        ...shadow.card,
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{
            color: detailColor,
            fontSize: typography.fontSize.labelSm,
            fontWeight: typography.fontWeight.semibold,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Text>
        {badge ? (
          <View style={{ backgroundColor: colors.secondaryContainer, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={{ color: valueColor, fontSize: 40, fontWeight: typography.fontWeight.bold, letterSpacing: -1, marginTop: spacing.sm }}>
        {value}
      </Text>
      <Text style={{ color: detailColor, fontSize: typography.fontSize.bodySm, marginTop: spacing.xs }}>
        {detail}
      </Text>

      {dark ? (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ bottom: -16, color: 'rgba(255,255,255,0.10)', fontSize: 86, position: 'absolute', right: 8 }}
        >
          ⚒
        </Text>
      ) : null}
    </View>
  );
}

function getBookingActionAnnouncement(notice) {
  if (!notice) {
    return '';
  }

  return `${notice.action === 'accept' ? 'Booking accepted' : 'Request declined'}: ${notice.service}`;
}

function StatusNotice({ notice, onOpenActiveJob }) {
  const announcement = getBookingActionAnnouncement(notice);
  const liveRegion = (
    <Text
      accessibilityLiveRegion="polite"
      style={{ height: 1, left: -10000, overflow: 'hidden', position: 'absolute', width: 1 }}
    >
      {announcement}
    </Text>
  );

  if (!notice) {
    return liveRegion;
  }

  const accepted = notice.action === 'accept';
  return (
    <>
      {liveRegion}
      <View
        style={{
          backgroundColor: accepted ? colors.successSoft : colors.surfaceContainerLow,
          borderColor: accepted ? colors.success : colors.outlineVariant,
          borderRadius: radius.lg,
          borderWidth: 1,
          padding: spacing.md,
        }}
        testID="provider-booking-action-success"
      >
        <Text style={{ color: accepted ? colors.success : colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}>
          {accepted ? 'Booking accepted' : 'Request declined'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, marginTop: spacing.xs }}>
          {notice.service}
        </Text>
        {accepted ? (
          <Pressable accessibilityRole="button" onPress={() => onOpenActiveJob(notice.bookingId)} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.secondaryBright, fontWeight: typography.fontWeight.bold }}>Open active job →</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

function RequestCard({ booking, actionState, layout, onAccept, onDecline }) {
  const busy = actionState.status === 'submitting' && actionState.bookingId === booking.bookingId;
  const actionError = actionState.status === 'error' && actionState.bookingId === booking.bookingId
    ? actionState.message
    : null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.outlineVariant,
        borderRadius: radius.lg,
        borderWidth: 1,
        padding: spacing.md,
        ...shadow.card,
      }}
      testID={`provider-booking-row-${booking.bookingId}`}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.secondaryContainer,
            borderRadius: radius.full,
            height: 40,
            justifyContent: 'center',
            width: 40,
          }}
        >
          <Text style={{ color: colors.secondaryBright, fontSize: 20 }}>⚡</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}
            testID={`provider-booking-service-${booking.bookingId}`}
          >
            {booking.requestedService}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, marginTop: 3 }}>
            {formatProviderRequestTimestamp(booking.createdAt)}
          </Text>
        </View>
        <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase' }}>
          New
        </Text>
      </View>

      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: radius.md,
          flexDirection: 'row',
          gap: spacing.sm,
          marginTop: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: 11,
        }}
      >
        <Text style={{ fontSize: 16 }}>⌖</Text>
        <Text style={{ color: colors.text, flex: 1, fontSize: typography.fontSize.bodySm }} numberOfLines={2}>
          {booking.customerLocation || 'Location not provided'}
        </Text>
      </View>

      <View style={{ flexDirection: layout.requestActionDirection, gap: spacing.sm, marginTop: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: busy && actionState.action === 'accept',
            disabled: actionState.status === 'submitting',
          }}
          disabled={actionState.status === 'submitting'}
          onPress={() => onAccept(booking)}
          style={{
            alignItems: 'center',
            backgroundColor: colors.secondaryBright,
            borderRadius: radius.md,
            flex: 1,
            opacity: busy ? 0.65 : 1,
            paddingVertical: 12,
          }}
          testID={`provider-booking-accept-${booking.bookingId}`}
        >
          <Text style={{ color: colors.onSecondary, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
            {busy && actionState.action === 'accept' ? 'Accepting…' : 'Accept'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: busy && actionState.action === 'decline',
            disabled: actionState.status === 'submitting',
          }}
          disabled={actionState.status === 'submitting'}
          onPress={() => onDecline(booking)}
          style={{
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderColor: colors.outline,
            borderRadius: radius.md,
            borderWidth: 1,
            flex: 1,
            opacity: busy ? 0.65 : 1,
            paddingVertical: 11,
          }}
          testID={`provider-booking-decline-${booking.bookingId}`}
        >
          <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold }}>
            {busy && actionState.action === 'decline' ? 'Declining…' : 'Decline'}
          </Text>
        </Pressable>
      </View>

      {actionError ? (
        <Text
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={{ color: colors.error, fontSize: typography.fontSize.bodySm, marginTop: spacing.sm }}
          testID={`provider-booking-error-${booking.bookingId}`}
        >
          {actionError}
        </Text>
      ) : null}
    </View>
  );
}

function DashboardError({ message, onRetry }) {
  return (
    <View
      style={{
        backgroundColor: colors.errorContainer,
        borderColor: colors.error,
        borderRadius: radius.lg,
        borderWidth: 1,
        padding: spacing.lg,
      }}
      testID="provider-dashboard-error"
    >
      <Text
        accessibilityLabel={`Dashboard unavailable: ${message}`}
        accessibilityLiveRegion="assertive"
        accessibilityRole="alert"
        style={{ color: colors.onErrorContainer, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}
      >
        Dashboard unavailable
      </Text>
      <Text style={{ color: colors.onErrorContainer, fontSize: typography.fontSize.bodySm, marginTop: spacing.sm }}>
        {message}
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={{ marginTop: spacing.md }} testID="provider-dashboard-retry">
        <Text style={{ color: colors.error, fontWeight: typography.fontWeight.bold }}>Try again</Text>
      </Pressable>
    </View>
  );
}

function ProviderNavigation({ bottomInset, homeDisabled, onHome, onPayouts, onProfile, onSignOut }) {
  const items = [
    { label: 'Home', icon: '⌂', onPress: onHome, active: true, disabled: homeDisabled, testID: 'provider-nav-home' },
    { label: 'Payouts', icon: '▣', onPress: onPayouts, testID: 'provider-open-payouts' },
    { label: 'Profile', icon: '♙', onPress: onProfile, testID: 'provider-open-onboarding' },
    { label: 'Sign out', icon: '↪', onPress: onSignOut, testID: 'provider-sign-out' },
  ];

  return (
    <View
      style={{
        backgroundColor: colors.glassStrong,
        borderTopColor: colors.outlineVariant,
        borderTopWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        paddingBottom: Math.max(spacing.sm, bottomInset),
        paddingTop: spacing.sm,
      }}
    >
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(item.disabled), selected: Boolean(item.active) }}
          disabled={item.disabled}
          key={item.label}
          onPress={item.onPress}
          style={{ alignItems: 'center', flex: 1, gap: 2, opacity: item.disabled ? 0.55 : 1, paddingVertical: 5 }}
          testID={item.testID}
        >
          <Text style={{ color: item.active ? colors.secondaryBright : colors.textMuted, fontSize: 20 }}>{item.icon}</Text>
          <Text style={{ color: item.active ? colors.secondaryBright : colors.textMuted, fontSize: typography.fontSize.labelSm, fontWeight: item.active ? typography.fontWeight.bold : typography.fontWeight.medium }}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ProviderScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const layout = deriveProviderLayout(useResponsiveLayout());
  const { session, signOut } = useSession();
  const bookingActionInFlight = useRef(false);
  const [dashboardState, setDashboardState] = useState(initialDashboardState);
  const [actionState, setActionState] = useState(initialActionState);
  const [notice, setNotice] = useState();

  const handleSignOut = useCallback(() => {
    signOut();
    router.replace('/auth');
  }, [router, signOut]);

  const loadDashboard = useCallback(async () => {
    if (session.status !== 'authenticated') {
      return;
    }

    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      handleSignOut();
      return;
    }

    if (bookingActionInFlight.current) {
      return;
    }

    setDashboardState((current) => ({ status: 'loading', profile: current.profile ?? null }));
    setActionState(initialActionState);

    const result = await loadProviderDashboardData(sessionToken);
    setDashboardState(result);
  }, [handleSignOut, session]);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      router.replace('/auth');
      return;
    }

    loadDashboard().catch((error) => {
      setDashboardState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unexpected provider dashboard error.',
        profile: null,
      });
    });
  }, [loadDashboard, router, session.status]);

  useEffect(() => {
    if (notice && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(getBookingActionAnnouncement(notice));
    }
  }, [notice]);

  const handleBookingAction = async (action, booking) => {
    if (bookingActionInFlight.current || actionState.status === 'submitting') {
      return;
    }

    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      handleSignOut();
      return;
    }

    bookingActionInFlight.current = true;
    setActionState({ status: 'submitting', action, bookingId: booking.bookingId });
    setNotice(undefined);

    try {
      const result = action === 'accept'
        ? await acceptBookingRequest({ sessionToken, bookingId: booking.bookingId })
        : await declineProviderBookingRequest({ sessionToken, bookingId: booking.bookingId });

      if (result.errorMessage) {
        setActionState({ status: 'error', action, bookingId: booking.bookingId, message: result.errorMessage });
        return;
      }

      setDashboardState((current) => {
        if (current.status !== 'loaded') {
          return current;
        }

        return {
          ...current,
          bookings: current.bookings.filter((candidate) => candidate.bookingId !== booking.bookingId),
        };
      });
      setActionState(initialActionState);
      setNotice({ action, bookingId: booking.bookingId, service: booking.requestedService });
    } catch (error) {
      setActionState({
        status: 'error',
        action,
        bookingId: booking.bookingId,
        message: error instanceof Error ? error.message : 'Unexpected booking action failure.',
      });
    } finally {
      bookingActionInFlight.current = false;
    }
  };

  const profile = dashboardState.profile ?? null;
  const bookings = dashboardState.status === 'loaded' ? dashboardState.bookings : [];
  const accessValue = dashboardState.status === 'loaded'
    ? 'Live'
    : dashboardState.status === 'blocked'
      ? 'Blocked'
      : dashboardState.status === 'loading'
        ? 'Checking'
        : 'Unavailable';

  return (
    <View style={{ backgroundColor: colors.surfaceBright, flex: 1 }} testID="provider-screen">
      <DashboardHeader
        layout={layout}
        onOpenProfile={() => router.push('/provider-onboarding')}
        profile={profile}
        topInset={safeAreaInsets.top}
      />

      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: spacing.lg,
          maxWidth: 560,
          paddingBottom: 40,
          paddingHorizontal: layout.contentGutter,
          paddingTop: spacing.lg,
          width: '100%',
        }}
        style={{ flex: 1 }}
      >
        <View style={{ gap: spacing.md }}>
          <MetricCard
            badge={dashboardState.status === 'loaded' && bookings.length > 0 ? `${bookings.length} NEW` : undefined}
            detail="Submitted jobs available to review"
            eyebrow="Open requests"
            tone="accent"
            value={dashboardState.status === 'loaded' || dashboardState.status === 'blocked'
              ? String(bookings.length).padStart(2, '0')
              : '—'}
          />
          <MetricCard
            detail={dashboardState.status === 'loaded' ? 'Verified providers can accept new work' : 'Verification protects customer bookings'}
            eyebrow="Booking access"
            tone="dark"
            value={accessValue}
          />
          <MetricCard
            detail={profile ? 'Provider identity is available' : 'Complete your provider identity'}
            eyebrow="Provider profile"
            value={getProviderProfileLabel(profile)}
          />
        </View>

        {dashboardState.profileWarning ? (
          <View style={{ backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.md, borderWidth: 1, padding: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
              Profile details are temporarily unavailable. Request access is unaffected.
            </Text>
          </View>
        ) : null}

        {dashboardState.status === 'loading' ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }} testID="provider-dashboard-loading">
            <ActivityIndicator color={colors.secondaryBright} size="small" />
            <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>Loading provider workspace…</Text>
          </View>
        ) : null}

        {dashboardState.status === 'error' ? (
          <DashboardError message={dashboardState.message} onRetry={loadDashboard} />
        ) : null}

        {dashboardState.status === 'blocked' ? (
          <View
            style={{
              backgroundColor: '#FFF7ED',
              borderColor: '#FED7AA',
              borderRadius: radius.lg,
              borderWidth: 1,
              padding: spacing.lg,
            }}
            testID="provider-booking-access-gated"
          >
            <Text style={{ color: '#9A3412', fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold }}>
              Verification required
            </Text>
            <Text style={{ color: '#9A3412', fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm, marginTop: spacing.sm }}>
              {dashboardState.accessMessage}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/provider-onboarding')} style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.cta, fontWeight: typography.fontWeight.bold }}>Manage verification →</Text>
            </Pressable>
          </View>
        ) : null}

        {dashboardState.status === 'loaded' ? (
          <>
            <StatusNotice
              notice={notice}
              onOpenActiveJob={(bookingId) => router.push({ pathname: '/active-job', params: { bookingId } })}
            />

            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: typography.fontWeight.bold }}>Live Requests</Text>
              <View style={{ backgroundColor: colors.secondaryContainer, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold }}>
                  {bookings.length} OPEN
                </Text>
              </View>
            </View>

            {bookings.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                {bookings.map((booking) => (
                  <RequestCard
                    actionState={actionState}
                    booking={booking}
                    key={booking.bookingId}
                    layout={layout}
                    onAccept={(selected) => handleBookingAction('accept', selected)}
                    onDecline={(selected) => handleBookingAction('decline', selected)}
                  />
                ))}
              </View>
            ) : (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  padding: spacing.xl,
                  ...shadow.card,
                }}
                testID="provider-booking-empty"
              >
                <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold }}>
                  No open requests
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, marginTop: spacing.sm, textAlign: 'center' }}>
                  New submitted bookings will appear here when they are available.
                </Text>
                <Pressable accessibilityRole="button" onPress={loadDashboard} style={{ marginTop: spacing.md }} testID="provider-booking-refresh">
                  <Text style={{ color: colors.secondaryBright, fontWeight: typography.fontWeight.bold }}>Refresh requests</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <ProviderNavigation
        bottomInset={safeAreaInsets.bottom}
        homeDisabled={actionState.status === 'submitting' || dashboardState.status === 'loading'}
        onHome={loadDashboard}
        onPayouts={() => router.push('/payouts')}
        onProfile={() => router.push('/provider-onboarding')}
        onSignOut={handleSignOut}
      />
    </View>
  );
}

export default ProviderScreen;
