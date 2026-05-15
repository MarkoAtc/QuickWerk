import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

const disputeCategories = ['quality', 'billing', 'safety', 'no-show', 'other'];

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

function SectionHeading({ title, subtitle }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 28,
          lineHeight: 32,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.textSoft,
            fontSize: typography.fontSize.bodyMd,
            lineHeight: typography.lineHeight.bodyMd,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function StatusBadge({ label }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
      }}
    >
      <Text
        style={{
          color: '#047857',
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SummaryMetric({ label, value, accent = colors.text }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 20,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      }}
    >
      <Text
        style={{
          color: colors.textMuted,
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
          fontSize: typography.fontSize.bodyLg,
          lineHeight: typography.lineHeight.bodyLg,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function TextArea({ value, onChangeText, placeholder, testID }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline
      numberOfLines={4}
      testID={testID}
      style={{
        minHeight: 112,
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
  );
}

export function BookingCompletionScreen({
  viewModel,
  reviewRating,
  reviewComment,
  onReviewCommentChange,
  onReviewRatingChange,
  onSubmitReview,
  onOpenDedicatedReview,
  disputeCategory,
  disputeDescription,
  onDisputeCategoryChange,
  onDisputeDescriptionChange,
  onOpenDispute,
  onRefresh,
  reviewFeedback,
  disputeFeedback,
  isReviewSubmitting,
  isDisputeSubmitting,
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
      testID="booking-completion-screen"
    >
      <View
        style={{
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
      >
        <StatusBadge label="Completed booking" />
        <Text
          style={{
            marginTop: spacing.lg,
            color: '#FFFFFF',
            fontSize: 42,
            lineHeight: 46,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: -0.8,
          }}
        >
          {viewModel.headline}
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
          {viewModel.subheadline}
        </Text>
        <Text
          style={{
            marginTop: spacing.lg,
            color: colors.onPrimaryContainer,
            fontSize: typography.fontSize.bodySm,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Booking ID: {viewModel.bookingId}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <SummaryMetric label="Service" value={viewModel.requestedService} />
        <SummaryMetric label="Payment" value={viewModel.paymentSummary} accent={colors.secondaryBright} />
      </View>

      <SectionCard>
        <SectionHeading
          title="Payment and invoice"
          subtitle="Keep the commercial outcome transparent and easy to verify after completion."
        />
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.semibold }}>
            {viewModel.paymentSummary}
          </Text>
          <Text style={{ color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
            {viewModel.invoiceSummary}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
            {viewModel.invoiceDetail}
          </Text>
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          title="Leave a review"
          subtitle="Capture customer satisfaction while the experience is still fresh."
        />

        <Text style={{ color: colors.textSoft, fontSize: typography.fontSize.bodyMd }}>{viewModel.reviewSummary}</Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
          {viewModel.latestReviewDetail}
        </Text>

        <Text style={{ marginTop: spacing.lg, color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.semibold }}>
          Rating: {reviewRating}/5
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= reviewRating;
            return (
              <Pressable
                key={value}
                onPress={() => onReviewRatingChange(value)}
                accessibilityRole="button"
                accessibilityLabel={`Set rating ${value}`}
                testID={`booking-completion-review-rating-${value}`}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.cta : colors.surfaceContainerHigh,
                  }}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : colors.text,
                      fontWeight: typography.fontWeight.bold,
                    }}
                  >
                    {value}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <TextArea
            value={reviewComment}
            onChangeText={onReviewCommentChange}
            placeholder="Share a short review about the completed job"
            testID="booking-completion-review-comment"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
          <Pressable
            onPress={onSubmitReview}
            accessibilityRole="button"
            accessibilityLabel="Submit review"
            testID="booking-completion-submit-review"
            disabled={isReviewSubmitting}
            style={{ flex: 1 }}
          >
          <View
            style={{
              ...componentStyles.button.primary,
              marginTop: spacing.lg,
              opacity: isReviewSubmitting ? 0.6 : 1,
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
              {isReviewSubmitting ? 'Submitting review…' : 'Submit review'}
            </Text>
          </View>
          </Pressable>

          <Pressable
            onPress={onOpenDedicatedReview}
            accessibilityRole="button"
            accessibilityLabel="Open dedicated review screen"
            testID="booking-completion-open-dedicated-review"
            style={{ flex: 1 }}
          >
            <View style={{ ...componentStyles.button.ghost, marginTop: 0 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.fontSize.labelMd,
                  fontWeight: typography.fontWeight.bold,
                }}
              >
                Open full review screen
              </Text>
            </View>
          </Pressable>
        </View>

        {reviewFeedback ? (
          <Text style={{ marginTop: spacing.md, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
            {reviewFeedback}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard>
        <SectionHeading
          title="Open a dispute"
          subtitle="If something went wrong, document it clearly so follow-up stays structured."
        />

        <Text style={{ color: colors.textSoft, fontSize: typography.fontSize.bodyMd }}>{viewModel.latestDisputeSummary}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
          {disputeCategories.map((category) => {
            const active = disputeCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => onDisputeCategoryChange(category)}
                accessibilityRole="button"
                accessibilityLabel={`Set dispute category ${category}`}
                testID={`booking-completion-dispute-category-${category}`}
              >
                <View
                  style={{
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: active ? colors.cta : colors.outlineVariant,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    backgroundColor: active ? 'rgba(255,138,0,0.10)' : colors.surface,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
                    {category}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <TextArea
            value={disputeDescription}
            onChangeText={onDisputeDescriptionChange}
            placeholder="Describe the issue clearly so it can be reviewed quickly"
            testID="booking-completion-dispute-description"
          />
        </View>

        <Pressable
          onPress={onOpenDispute}
          accessibilityRole="button"
          accessibilityLabel="Open dispute"
          testID="booking-completion-open-dispute"
          disabled={isDisputeSubmitting}
        >
          <View
            style={{
              marginTop: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: '#B91C1C',
              paddingVertical: 16,
              alignItems: 'center',
              opacity: isDisputeSubmitting ? 0.6 : 1,
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
              {isDisputeSubmitting ? 'Opening dispute…' : 'Open dispute'}
            </Text>
          </View>
        </Pressable>

        {disputeFeedback ? (
          <Text style={{ marginTop: spacing.md, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
            {disputeFeedback}
          </Text>
        ) : null}
      </SectionCard>

      {viewModel.warningMessages.length > 0 ? (
        <View
          style={{
            backgroundColor: '#FEFCE8',
            borderColor: '#FDE68A',
            borderWidth: 1,
            borderRadius: 28,
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          {viewModel.warningMessages.map((message, i) => (
            <Text key={`${message}-${i}`} style={{ color: '#854D0E', fontSize: typography.fontSize.bodySm }}>
              {message}
            </Text>
          ))}
        </View>
      ) : null}

      {viewModel.statusHistory.length > 0 ? (
        <SectionCard>
          <SectionHeading title="Status history" subtitle="A lightweight audit trail of what happened after the booking was completed." />
          <View style={{ gap: spacing.sm }}>
            {viewModel.statusHistory.map((entry, i) => (
              <Text key={`${entry}-${i}`} style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
                {entry}
              </Text>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <Pressable onPress={onRefresh} accessibilityRole="button" accessibilityLabel="Refresh completion details" testID="booking-completion-refresh">
        <View style={componentStyles.button.ghost}>
          <Text style={{ color: colors.text, fontWeight: typography.fontWeight.semibold }}>Refresh</Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

export default BookingCompletionScreen;
