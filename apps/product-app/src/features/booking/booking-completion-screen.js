import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

const disputeCategories = ['quality', 'billing', 'safety', 'no-show', 'other'];

export function BookingCompletionScreen({
  viewModel,
  reviewRating,
  reviewComment,
  onReviewCommentChange,
  onReviewRatingChange,
  onSubmitReview,
  disputeCategory,
  disputeDescription,
  onDisputeCategoryChange,
  onDisputeDescriptionChange,
  onOpenDispute,
  onRefresh,
  reviewFeedback,
  disputeFeedback,
  isReviewSubmitting = false,
  isDisputeSubmitting = false,
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.lg,
      }}
      testID="booking-completion-screen"
    >
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, ...shadow.soft, gap: spacing.sm }}>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>
          Booking ID: {viewModel.bookingId}
        </Text>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
          {viewModel.headline}
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.sm }}>{viewModel.subheadline}</Text>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
          Service: {viewModel.requestedService}
        </Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, ...shadow.soft, gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
          Payment and invoice
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.sm }}>{viewModel.paymentSummary}</Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.sm }}>{viewModel.invoiceSummary}</Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>{viewModel.invoiceDetail}</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, ...shadow.soft, gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
          Reviews
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.sm }}>{viewModel.reviewSummary}</Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>{viewModel.latestReviewDetail}</Text>

        <Text style={{ color: colors.text, marginTop: spacing.sm }}>Rating: {reviewRating}/5</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => onReviewRatingChange(value)}
              accessibilityRole="button"
              accessibilityLabel={`Set rating ${value}`}
              testID={`booking-completion-review-rating-${value}`}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: value <= reviewRating ? colors.primary : '#E2E8F0',
              }}
            >
              <Text style={{ color: value <= reviewRating ? colors.surface : colors.text, fontWeight: typography.fontWeight.bold }}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          value={reviewComment}
          onChangeText={onReviewCommentChange}
          placeholder="Optional comment"
          multiline
          numberOfLines={3}
          testID="booking-completion-review-comment"
          style={{
            marginTop: spacing.sm,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: radius.lg,
            padding: spacing.sm,
            minHeight: 70,
            textAlignVertical: 'top',
            color: colors.text,
            backgroundColor: '#F8FAFC',
          }}
        />

        <TouchableOpacity
          onPress={onSubmitReview}
          accessibilityRole="button"
          accessibilityLabel="Submit review"
          testID="booking-completion-submit-review"
          disabled={isReviewSubmitting}
          style={{
            marginTop: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            paddingVertical: 10,
            alignItems: 'center',
            opacity: isReviewSubmitting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: typography.fontWeight.bold }}>
            {isReviewSubmitting ? 'Submitting review...' : 'Submit review'}
          </Text>
        </TouchableOpacity>

        {reviewFeedback ? <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>{reviewFeedback}</Text> : null}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, ...shadow.soft, gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
          Disputes
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.sm }}>{viewModel.latestDisputeSummary}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
          {disputeCategories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => onDisputeCategoryChange(category)}
              accessibilityRole="button"
              accessibilityLabel={`Set dispute category ${category}`}
              testID={`booking-completion-dispute-category-${category}`}
              style={{
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: disputeCategory === category ? colors.primary : '#CBD5E1',
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: disputeCategory === category ? '#DBEAFE' : colors.surface,
              }}
            >
              <Text style={{ color: colors.text, fontSize: typography.fontSize.xs }}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          value={disputeDescription}
          onChangeText={onDisputeDescriptionChange}
          placeholder="Describe the dispute"
          multiline
          numberOfLines={3}
          testID="booking-completion-dispute-description"
          style={{
            marginTop: spacing.sm,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: radius.lg,
            padding: spacing.sm,
            minHeight: 70,
            textAlignVertical: 'top',
            color: colors.text,
            backgroundColor: '#F8FAFC',
          }}
        />

        <TouchableOpacity
          onPress={onOpenDispute}
          accessibilityRole="button"
          accessibilityLabel="Open dispute"
          testID="booking-completion-open-dispute"
          disabled={isDisputeSubmitting}
          style={{
            marginTop: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: '#B91C1C',
            paddingVertical: 10,
            alignItems: 'center',
            opacity: isDisputeSubmitting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: typography.fontWeight.bold }}>
            {isDisputeSubmitting ? 'Opening dispute...' : 'Open dispute'}
          </Text>
        </TouchableOpacity>

        {disputeFeedback ? <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>{disputeFeedback}</Text> : null}
      </View>

      {viewModel.warningMessages.length > 0 ? (
        <View style={{ backgroundColor: '#FEFCE8', borderColor: '#FDE68A', borderWidth: 1, borderRadius: radius.card, padding: spacing.md, gap: spacing.xs }}>
          {viewModel.warningMessages.map((message) => (
            <Text key={message} style={{ color: '#854D0E', fontSize: typography.fontSize.xs }}>
              {message}
            </Text>
          ))}
        </View>
      ) : null}

      {viewModel.statusHistory.length > 0 ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, ...shadow.soft, gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
            Status history
          </Text>
          {viewModel.statusHistory.map((entry) => (
            <Text key={entry} style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>
              {entry}
            </Text>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel="Refresh completion details"
        testID="booking-completion-refresh"
        style={{
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.semibold }}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default BookingCompletionScreen;
