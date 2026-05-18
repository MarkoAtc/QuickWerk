import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

import { loadProviderDetail } from './provider-detail-actions';

function StatPill({ label, value, accent = colors.secondaryBright }) {
  return (
    <View
      style={{
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
        {label}: <Text style={{ color: accent }}>{value}</Text>
      </Text>
    </View>
  );
}

function ReviewCard({ review, index }) {
  return (
    <View
      key={`${review.author}-${index}`}
      style={{
        borderRadius: radius.sheet,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(199,198,204,0.30)',
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.semibold }}>
          {review.author}
        </Text>
        <Text style={{ color: '#8A6500', fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>
          ★ {review.rating}
        </Text>
      </View>
      <Text style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
        {review.comment}
      </Text>
    </View>
  );
}

export function ProviderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const providerUserId = Array.isArray(params.providerUserId) ? params.providerUserId[0] : params.providerUserId;

  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    if (!providerUserId || typeof providerUserId !== 'string') {
      setState({ status: 'error', errorMessage: 'Missing provider id.' });
      return;
    }

    setState({ status: 'loading' });

    loadProviderDetail(providerUserId)
      .then((result) => {
        if (result.errorMessage) {
          setState({ status: 'error', errorMessage: result.errorMessage });
          return;
        }

        setState({ status: 'loaded', provider: result.provider });
      })
      .catch((error) => {
        setState({
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unexpected provider detail error.',
        });
      });
  }, [providerUserId]);

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.secondaryBright} size="small" />
        <Text style={{ marginTop: spacing.sm, color: colors.textMuted }}>Loading provider profile…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.container, justifyContent: 'center' }}>
        <View
          style={{
            borderRadius: radius.sheet,
            padding: spacing.lg,
            backgroundColor: colors.errorContainer,
            borderWidth: 1,
            borderColor: '#FECACA',
          }}
        >
          <Text style={{ color: colors.onErrorContainer, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.semibold }}>
            Unable to load provider.
          </Text>
          <Text style={{ marginTop: spacing.sm, color: colors.onErrorContainer, fontSize: typography.fontSize.bodySm }}>
            {state.errorMessage}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text style={{ marginTop: spacing.md, color: colors.onErrorContainer, fontWeight: typography.fontWeight.bold }}>
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const provider = state.provider;
  const reviews = provider.reviews ?? [];

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="provider-detail-screen"
    >
      <View
        style={{
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()} testID="provider-detail-back">
          <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
            ← Back
          </Text>
        </Pressable>

        <View style={{ marginTop: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.xl,
              backgroundColor: 'rgba(255,255,255,0.10)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: typography.fontWeight.bold }}>
              {provider.displayName
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('') || 'PR'}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 42,
                lineHeight: 46,
                fontWeight: typography.fontWeight.bold,
                letterSpacing: -0.8,
              }}
            >
              {provider.displayName}
            </Text>
            <Text style={{ marginTop: spacing.xs, color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodyMd }}>
              {provider.serviceArea || 'Service area not specified'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
          <StatPill label="Rating" value={provider.averageRating ?? '4.9'} accent={colors.warning} />
          <StatPill label="Reviews" value={String(reviews.length || 0)} />
          <StatPill label="Status" value={provider.isVerified ? 'Verified' : 'Pending'} accent={provider.isVerified ? colors.success : colors.cta} />
        </View>
      </View>

      <View
        style={{
          marginTop: spacing.xl,
          borderRadius: 28,
          padding: spacing.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
          About this provider
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
          {provider.bio || 'No provider bio available yet.'}
        </Text>
      </View>

      <View
        style={{
          marginTop: spacing.xl,
          borderRadius: 28,
          padding: spacing.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
          Trades & service coverage
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {(provider.tradeCategories ?? []).map((category) => (
            <View
              key={category}
              style={{
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                backgroundColor: colors.surfaceContainer,
              }}
            >
              <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
                {category}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
          Reviews
        </Text>
        {reviews.length > 0 ? reviews.map((review, index) => <ReviewCard index={index} key={`${review.author}-${index}`} review={review} />) : (
          <View
            style={{
              borderRadius: radius.sheet,
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: 'rgba(199,198,204,0.30)',
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
              No reviews available yet.
            </Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityLabel="Continue to booking"
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/booking-wizard',
            params: { providerUserId: provider.providerUserId, category: provider.tradeCategories?.[0] ?? 'general' },
          })
        }
        testID="provider-detail-book-now"
      >
        <View style={{ ...componentStyles.button.primary, marginTop: spacing.xl }}>
          <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
            Continue to booking
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

export default ProviderDetailScreen;
