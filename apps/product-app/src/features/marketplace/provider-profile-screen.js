import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

function ProfileHero({ provider }) {
  return (
    <View
      style={{
        borderRadius: 32,
        padding: spacing.xl,
        backgroundColor: colors.primaryContainer,
        ...shadow.elevated,
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: radius.xl,
            backgroundColor: 'rgba(255,255,255,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: typography.fontWeight.bold }}>
            {provider.initials || 'PR'}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 42, lineHeight: 46, fontWeight: typography.fontWeight.bold, letterSpacing: -0.8 }}>
            {provider.name}
          </Text>
          <Text style={{ marginTop: spacing.xs, color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodyMd }}>
            {provider.title}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: 'rgba(255,214,0,0.14)' }}>
              <Text style={{ color: '#D8A200', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
                ★ {provider.rating}
              </Text>
            </View>
            <View style={{ borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: 'rgba(16,185,129,0.12)' }}>
              <Text style={{ color: '#047857', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
                Verified
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={{ marginTop: spacing.lg, color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
        {provider.summary}
      </Text>
    </View>
  );
}

function DetailCard({ title, children }) {
  return (
    <View
      style={{
        borderRadius: 28,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.card,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
        {title}
      </Text>
      <View style={{ marginTop: spacing.md }}>{children}</View>
    </View>
  );
}

function ReviewCard({ review }) {
  return (
    <View
      style={{
        borderRadius: radius.xl,
        padding: spacing.md,
        backgroundColor: colors.surfaceContainerLow,
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

export function ProviderProfileScreen({ provider, onStartBooking }) {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="provider-profile-screen"
    >
      <ProfileHero provider={provider} />

      <View style={{ marginTop: spacing.xl, gap: spacing.xl }}>
        <DetailCard title="Services">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {provider.services.map((service) => (
              <View
                key={service}
                style={{
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: colors.surfaceContainer,
                }}
              >
                <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
                  {service}
                </Text>
              </View>
            ))}
          </View>
        </DetailCard>

        <DetailCard title="About">
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
            {provider.description}
          </Text>
        </DetailCard>

        <DetailCard title="Recent reviews">
          {provider.reviews.map((review) => (
            <ReviewCard key={`${review.author}-${review.comment}`} review={review} />
          ))}
        </DetailCard>
      </View>

      <Pressable accessibilityRole="button" onPress={onStartBooking} testID="provider-profile-start-booking">
        <View style={{ ...componentStyles.button.primary, marginTop: spacing.xl }}>
          <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
            Start booking
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

export default ProviderProfileScreen;
