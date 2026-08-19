import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { colors, componentStyles, radius, spacing, typography } from '@quickwerk/ui';

import { loadMyPayouts } from './payout-screen-actions';
import { initialPayoutLoadState } from './payout-state';
import { resolveSessionToken, useSession } from '../../shared/session-provider';

const STATUS_TONE = {
  settled: { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  pending: { backgroundColor: 'rgba(255, 138, 0, 0.14)', color: colors.cta },
  processing: { backgroundColor: 'rgba(2, 102, 255, 0.12)', color: colors.secondary },
  failed: { backgroundColor: 'rgba(186, 26, 26, 0.12)', color: colors.error },
};

function formatMoney(amountCents, currency) {
  return `${currency} ${(amountCents / 100).toFixed(2)}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] ?? { backgroundColor: colors.surfaceContainer, color: colors.textMuted };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: tone.backgroundColor,
      }}
    >
      <Text
        style={{
          color: tone.color,
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {status}
      </Text>
    </View>
  );
}

function PayoutCard({ payout }) {
  return (
    <View
      style={{
        ...componentStyles.card.elevated,
        borderRadius: 24,
        gap: spacing.sm,
      }}
      testID={`payout-card-${payout.payoutId}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.fontSize.headlineSm,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          {formatMoney(payout.amountCents, payout.currency)}
        </Text>
        <StatusBadge status={payout.status} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
        Booking {payout.bookingId}
      </Text>
      <Text style={{ color: colors.textSoft, fontSize: typography.fontSize.bodySm }}>
        Created {formatDate(payout.createdAt)}
        {payout.settledAt ? ` · Settled ${formatDate(payout.settledAt)}` : ''}
      </Text>
    </View>
  );
}

export function PayoutScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [loadState, setLoadState] = useState(initialPayoutLoadState);

  const load = () => {
    const sessionToken = resolveSessionToken(session);

    if (!sessionToken) {
      signOut();
      router.replace('/auth');
      return;
    }

    setLoadState({ status: 'loading' });

    loadMyPayouts(sessionToken).then(setLoadState);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        gap: spacing.md,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="payout-screen"
    >
      <Pressable accessibilityRole="button" onPress={() => router.back()} testID="payout-back">
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>← Back</Text>
      </Pressable>

      <Text
        style={{
          color: colors.text,
          fontSize: typography.fontSize.headlineLg,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        Payouts
      </Text>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }} testID="payout-loading">
          <ActivityIndicator color={colors.secondaryBright} />
        </View>
      ) : null}

      {loadState.status === 'error' ? (
        <View
          style={{
            borderRadius: radius.lg,
            padding: spacing.md,
            backgroundColor: 'rgba(186, 26, 26, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(186, 26, 26, 0.2)',
          }}
          testID="payout-error"
        >
          <Text style={{ color: colors.error, fontSize: typography.fontSize.bodySm }}>{loadState.message}</Text>
        </View>
      ) : null}

      {loadState.status === 'loaded' && loadState.payouts.length === 0 ? (
        <View
          style={{
            ...componentStyles.card.base,
            borderRadius: 24,
            alignItems: 'center',
            paddingVertical: spacing.xxl,
          }}
          testID="payout-empty"
        >
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodyMd }}>
            No payouts yet. Completed, paid bookings will show up here.
          </Text>
        </View>
      ) : null}

      {loadState.status === 'loaded'
        ? loadState.payouts.map((payout) => <PayoutCard key={payout.payoutId} payout={payout} />)
        : null}
    </ScrollView>
  );
}

export default PayoutScreen;
