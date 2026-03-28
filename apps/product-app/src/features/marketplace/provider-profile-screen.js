import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

function Avatar({ name }) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AK';

  return (
    <View
      style={{
        width: 96,
        height: 96,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.soft,
      }}
    >
      <Text
        style={{
          color: colors.surface,
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

function VerificationBadge() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8F5EE',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: colors.primary,
        alignSelf: 'center',
        marginTop: spacing.sm,
      }}
    >
      <Text
        style={{
          color: colors.primary,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        ✓ Verified
      </Text>
    </View>
  );
}

function StatColumn({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: typography.fontSize.xs,
          letterSpacing: 1,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function StatDivider() {
  return (
    <View
      style={{
        width: 1,
        height: 32,
        backgroundColor: colors.muted,
        opacity: 0.3,
        alignSelf: 'center',
      }}
    />
  );
}

function ReviewCard({ review }) {
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.card,
        padding: spacing.lg,
        ...shadow.soft,
      }}
    >
      {/* Stars */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Text key={i} style={{ color: '#F59E0B', fontSize: 16 }}>
            ★
          </Text>
        ))}
      </View>

      {/* Quotation mark */}
      <Text
        style={{
          color: colors.accent,
          fontSize: 40,
          lineHeight: 32,
          fontWeight: typography.fontWeight.bold,
          marginBottom: spacing.xs,
        }}
      >
        "
      </Text>

      {/* Review text */}
      <Text
        style={{
          color: colors.text,
          fontSize: typography.fontSize.sm,
          lineHeight: 22,
          marginBottom: spacing.sm,
          fontStyle: 'italic',
        }}
      >
        {review.text}
      </Text>

      {/* Reviewer name */}
      <Text
        style={{
          color: colors.muted,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
        }}
      >
        — {review.reviewer}
      </Text>
    </View>
  );
}

const DEFAULT_PROVIDER = {
  name: 'Alex Schneider',
  title: 'Verified Emergency Plumber',
  etaMin: 12,
  rating: 4.9,
  jobCount: 342,
  bio: 'With over 15 years of experience in Vienna, I specialize in rapid response plumbing emergencies. My goal is to fix your issue quickly while making sure you understand exactly what\'s being done.',
  review: {
    text: '"Alex was a lifesaver! Arrived exactly on time, was very reassuring, and fixed the burst pipe without any hidden fees. Highly recommend for any plumbing emergency."',
    reviewer: 'Sarah M.',
  },
};

export function ProviderProfile({ provider = DEFAULT_PROVIDER, onRequest, onClose }) {
  const p = { ...DEFAULT_PROVIDER, ...provider };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 100,
        }}
        testID="provider-profile-screen"
      >
        {/* Header row: close button + title */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.xl,
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose ?? (() => {})}
            testID="provider-profile-close"
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.muted,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>

          <Text
            style={{
              color: colors.text,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Provider Profile
          </Text>

          {/* Spacer to center title */}
          <View style={{ width: 36 }} />
        </View>

        {/* Avatar + verification */}
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Avatar name={p.name} />
          <VerificationBadge />
        </View>

        {/* Name + title */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {p.name}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: typography.fontSize.sm,
              marginTop: spacing.xs,
            }}
          >
            {p.title}
          </Text>
        </View>

        {/* Stats row */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.background,
            borderRadius: radius.card,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            ...shadow.soft,
          }}
        >
          <StatColumn value={`${p.etaMin} min`} label="ETA" />
          <StatDivider />
          <StatColumn value={`${p.rating} ★`} label="RATING" />
          <StatDivider />
          <StatColumn value={String(p.jobCount)} label="JOBS" />
        </View>

        {/* About section */}
        <Text
          style={{
            color: colors.text,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
          }}
        >
          About {p.name.split(' ')[0]}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.fontSize.sm,
            lineHeight: 22,
            marginBottom: spacing.xl,
          }}
        >
          {p.bio}
        </Text>

        {/* Recent Review */}
        <Text
          style={{
            color: colors.text,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.md,
          }}
        >
          Recent Review
        </Text>
        <ReviewCard review={p.review} />
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.background,
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Request immediate help"
          onPress={onRequest ?? (() => {})}
          testID="provider-profile-request"
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.text,
            borderRadius: radius.pill,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            ...shadow.soft,
          }}
        >
          <Text style={{ fontSize: 16 }}>⚡</Text>
          <Text
            style={{
              color: colors.surface,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            Request Immediate Help
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default ProviderProfile;
