import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

function SectionCard({ children }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 28,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.card,
      }}
    >
      {children}
    </View>
  );
}

function ReviewChip({ value, active, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Set rating ${value}`} onPress={() => onPress(value)}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? colors.cta : colors.surfaceContainerHigh,
        }}
      >
        <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: typography.fontWeight.bold }}>{value}</Text>
      </View>
    </Pressable>
  );
}

function ExistingReviewCard({ review }) {
  return (
    <View
      style={{
        borderRadius: 24,
        padding: spacing.lg,
        backgroundColor: colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}>
          {review.authorName ?? 'Anonymous'}
        </Text>
        <Text style={{ color: '#8A6500', fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>
          ★ {review.rating}
        </Text>
      </View>
      <Text
        style={{
          marginTop: spacing.sm,
          color: colors.textSoft,
          fontSize: typography.fontSize.bodySm,
          lineHeight: typography.lineHeight.bodySm,
        }}
      >
        {review.comment || 'No written feedback provided.'}
      </Text>
    </View>
  );
}

export function ReviewScreen({
  headline,
  subheadline,
  rating,
  comment,
  onRatingChange,
  onCommentChange,
  onSubmit,
  onRefresh,
  submitState,
  loadState,
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        gap: spacing.xl,
      }}
      testID="review-screen"
    >
      <View
        style={{
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 42,
            lineHeight: 46,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: -0.8,
          }}
        >
          {headline}
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
          {subheadline}
        </Text>
      </View>

      <SectionCard>
        <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
          Leave a structured review
        </Text>
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.textSoft,
            fontSize: typography.fontSize.bodyMd,
            lineHeight: typography.lineHeight.bodyMd,
          }}
        >
          Rate the completed job and add short feedback so service quality is easier to track later.
        </Text>

        <Text style={{ marginTop: spacing.lg, color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.semibold }}>
          Rating: {rating}/5
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <ReviewChip key={value} value={value} active={value <= rating} onPress={onRatingChange} />
          ))}
        </View>

        <TextInput
          value={comment}
          onChangeText={onCommentChange}
          placeholder="Describe the experience in a few sentences"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          testID="review-comment-input"
          style={{
            minHeight: 128,
            marginTop: spacing.lg,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            textAlignVertical: 'top',
            color: colors.text,
            backgroundColor: colors.surfaceContainerLow,
          }}
        />

        <Pressable accessibilityRole="button" onPress={onSubmit} testID="review-submit-button">
          <View
            style={{
              ...componentStyles.button.primary,
              marginTop: spacing.lg,
              opacity: submitState.status === 'submitting' ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: typography.fontSize.labelMd,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              {submitState.status === 'submitting' ? 'Submitting review…' : 'Submit review'}
            </Text>
          </View>
        </Pressable>

        {submitState.status === 'error' ? (
          <Text style={{ marginTop: spacing.md, color: colors.error, fontSize: typography.fontSize.bodySm }}>{submitState.message}</Text>
        ) : null}

        {submitState.status === 'submitted' ? (
          <Text style={{ marginTop: spacing.md, color: colors.success, fontSize: typography.fontSize.bodySm }}>
            Review submitted successfully.
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
              Existing reviews
            </Text>
            <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd }}>
              Keep the feedback history visible for trust and quality control.
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onRefresh} testID="review-refresh-button">
            <View style={componentStyles.button.ghost}>
              <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
                Refresh
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          {loadState.status === 'loading' ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>Loading reviews…</Text>
          ) : null}

          {loadState.status === 'error' ? (
            <Text style={{ color: colors.error, fontSize: typography.fontSize.bodySm }}>{loadState.message}</Text>
          ) : null}

          {loadState.status === 'loaded' && loadState.reviews.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>No reviews available yet.</Text>
          ) : null}

          {loadState.status === 'loaded'
            ? loadState.reviews.map((review, index) => <ExistingReviewCard key={`${review.authorName}-${index}`} review={review} />)
            : null}
        </View>
      </SectionCard>
    </ScrollView>
  );
}

export default ReviewScreen;
