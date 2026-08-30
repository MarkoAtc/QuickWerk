import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

import { deriveActivePostJobLayout } from '../../shared/active-post-job-layout';
import { useResponsiveLayout } from '../../shared/use-responsive-layout';
import { reviewHighlightOptions } from './review-screen-presenter';

const orange = colors.cta;

function ProviderAvatar({ provider }) {
  const initial = provider?.displayName?.trim()?.charAt(0)?.toUpperCase() || 'Q';

  return (
    <View style={{ position: 'relative' }}>
      {provider?.photoUrl ? (
        <Image
          accessibilityLabel={`${provider.displayName} profile photo`}
          source={{ uri: provider.photoUrl }}
          style={{
            backgroundColor: colors.surfaceContainerHigh,
            borderColor: colors.surface,
            borderRadius: radius.full,
            borderWidth: 4,
            height: 96,
            width: 96,
            ...shadow.card,
          }}
        />
      ) : (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.primaryContainer,
            borderColor: colors.surface,
            borderRadius: radius.full,
            borderWidth: 4,
            height: 96,
            justifyContent: 'center',
            width: 96,
            ...shadow.card,
          }}
        >
          <Text style={{ color: colors.textInverse, fontSize: 34, fontWeight: typography.fontWeight.bold }}>
            {initial}
          </Text>
        </View>
      )}
      <View
        accessibilityLabel="Provider active"
        style={{
          backgroundColor: colors.success,
          borderColor: colors.surface,
          borderRadius: radius.full,
          borderWidth: 4,
          bottom: 2,
          height: 24,
          position: 'absolute',
          right: 2,
          width: 24,
        }}
      />
    </View>
  );
}

function StarRating({ rating, onRatingChange, disabled }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((value) => {
        const selected = value <= rating;
        return (
          <Pressable
            accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === rating, disabled }}
            disabled={disabled}
            key={value}
            onPress={() => onRatingChange(value)}
            testID={`review-rating-${value}`}
            style={{ alignItems: 'center', height: 52, justifyContent: 'center', width: 52 }}
          >
            <Text style={{ color: selected ? orange : colors.outlineVariant, fontSize: 46, lineHeight: 52 }}>
              {selected ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HighlightChip({ active, disabled, label, onPress }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={`review-highlight-${label.toLowerCase().replaceAll(' ', '-')}`}
      style={{
        backgroundColor: active ? colors.secondaryBright : colors.surfaceContainerHigh,
        borderColor: active ? colors.secondaryBright : 'rgba(148, 163, 184, 0.16)',
        borderRadius: radius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          color: active ? colors.onSecondary : colors.text,
          fontSize: typography.fontSize.bodySm,
          fontWeight: typography.fontWeight.medium,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SuccessCard({ existing, onClose }) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.outlineVariant,
        borderRadius: radius.xl,
        borderWidth: 1,
        padding: spacing.xl,
        ...shadow.elevated,
      }}
      testID="review-success"
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.successSoft,
          borderRadius: radius.full,
          height: 72,
          justifyContent: 'center',
          width: 72,
        }}
      >
        <Text style={{ color: colors.success, fontSize: 36 }}>✓</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: typography.fontWeight.bold, marginTop: spacing.md }}>
        {existing ? 'Review already submitted' : 'Great Job!'}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodyMd, marginTop: spacing.sm, textAlign: 'center' }}>
        {existing
          ? 'Your feedback for this booking is already on record.'
          : 'Your feedback has been shared with the provider and the community.'}
      </Text>
      <Pressable accessibilityRole="button" onPress={onClose} style={{ marginTop: spacing.lg }} testID="review-success-close">
        <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}>
          Back to booking
        </Text>
      </Pressable>
    </View>
  );
}

export function ReviewScreen({
  booking,
  provider,
  rating,
  ratingLabel,
  comment,
  selectedHighlights,
  photoAttached,
  submitState,
  onClose,
  onRatingChange,
  onCommentChange,
  onToggleHighlight,
  onTogglePhoto,
  onSubmit,
}) {
  const layout = deriveActivePostJobLayout(useResponsiveLayout());
  const submitted = submitState.status === 'submitted';
  const submitting = submitState.status === 'submitting';
  const providerName = provider?.displayName || 'your provider';

  return (
    <View style={{ backgroundColor: colors.surfaceBright, flex: 1 }} testID="review-screen">
      <View
        style={{
          backgroundColor: colors.glassStrong,
          borderBottomColor: 'rgba(199, 198, 204, 0.28)',
          borderBottomWidth: 1,
          paddingHorizontal: layout.contentGutter,
          paddingVertical: spacing.md,
          ...shadow.card,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 'auto', maxWidth: 560, width: '100%' }}>
          <Pressable
            accessibilityLabel="Close review"
            accessibilityRole="button"
            onPress={onClose}
            style={{ alignItems: 'center', height: 40, justifyContent: 'center', width: 40 }}
            testID="review-close"
          >
            <Text style={{ color: colors.text, fontSize: 34, fontWeight: typography.fontWeight.regular, lineHeight: 36 }}>×</Text>
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: typography.fontWeight.bold }}>Handwerker</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
      <View style={{ backgroundColor: colors.secondaryContainer, height: 4 }}>
        <View style={{ backgroundColor: colors.secondaryBright, height: 4, width: '75%' }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: 560,
          paddingBottom: 56,
          paddingHorizontal: layout.contentGutter,
          paddingTop: 72,
          width: '100%',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center' }}>
          <ProviderAvatar provider={provider} />
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: typography.fontWeight.bold, marginTop: spacing.xl, textAlign: 'center' }}>
            Rate your Repair
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodyLg, lineHeight: typography.lineHeight.bodyLg, marginTop: spacing.sm, textAlign: 'center' }}>
            How was your {booking.requestedService} with{' '}
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{providerName}</Text>?
          </Text>
        </View>

        {submitted ? (
          <View style={{ marginTop: spacing.xl }}>
            <SuccessCard existing={submitState.existing === true} onClose={onClose} />
          </View>
        ) : (
          <>
            <View style={{ marginTop: spacing.xl }}>
              <StarRating disabled={submitting} onRatingChange={onRatingChange} rating={rating} />
              <Text
                style={{
                  color: orange,
                  fontSize: typography.fontSize.labelMd,
                  fontWeight: typography.fontWeight.semibold,
                  letterSpacing: 2,
                  marginTop: spacing.sm,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                {ratingLabel}
              </Text>
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSize.labelMd,
                  letterSpacing: 1.6,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                What stood out?
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md }}>
                {reviewHighlightOptions.map((highlight) => (
                  <HighlightChip
                    active={selectedHighlights.includes(highlight)}
                    disabled={submitting}
                    key={highlight}
                    label={highlight}
                    onPress={() => onToggleHighlight(highlight)}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Tell us more about the service
              </Text>
              <View style={{ marginTop: spacing.sm, position: 'relative' }}>
                <TextInput
                  editable={!submitting}
                  maxLength={500}
                  multiline
                  numberOfLines={5}
                  onChangeText={onCommentChange}
                  placeholder={`${providerName === 'your provider' ? 'The provider' : providerName} was efficient and explained the whole process…`}
                  placeholderTextColor={colors.outline}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.outlineVariant,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    color: colors.text,
                    fontSize: typography.fontSize.bodyMd,
                    lineHeight: typography.lineHeight.bodyMd,
                    minHeight: 152,
                    paddingBottom: 36,
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.md,
                    textAlignVertical: 'top',
                  }}
                  testID="review-comment-input"
                  value={comment}
                />
                <Text style={{ bottom: 12, color: colors.textMuted, fontSize: typography.fontSize.bodySm, position: 'absolute', right: 14 }}>
                  {comment.length} / 500
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: photoAttached, disabled: submitting }}
              disabled={submitting}
              onPress={onTogglePhoto}
              style={{
                alignItems: 'center',
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.outlineVariant,
                borderRadius: radius.lg,
                borderStyle: 'dashed',
                borderWidth: 1,
                flexDirection: 'row',
                gap: spacing.md,
                marginTop: spacing.xl,
                padding: spacing.md,
              }}
              testID="review-photo-toggle"
            >
              <View style={{ alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 }}>
                <Text style={{ color: colors.text, fontSize: 24 }}>{photoAttached ? '✓' : '▣'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.semibold }}>
                  {photoAttached ? 'Demo photo attached' : 'Add Photos'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, marginTop: 2 }}>
                  Preview only — photos are not uploaded
                </Text>
              </View>
              <View style={{ alignItems: 'center', backgroundColor: colors.secondaryBright, borderRadius: radius.full, height: 36, justifyContent: 'center', width: 36 }}>
                <Text style={{ color: colors.onSecondary, fontSize: 24 }}>{photoAttached ? '−' : '+'}</Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
              onPress={onSubmit}
              style={{
                alignItems: 'center',
                backgroundColor: orange,
                borderRadius: radius.lg,
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: spacing.xl,
                opacity: submitting ? 0.65 : 1,
                paddingHorizontal: spacing.lg,
                paddingVertical: 18,
                ...shadow.cta,
              }}
              testID="review-submit-button"
            >
              <Text style={{ color: colors.onPrimary, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.semibold }}>
                {submitting ? 'Submitting Review…' : 'Submit Review'}
              </Text>
              {!submitting ? <Text style={{ color: colors.onPrimary, fontSize: 28, marginLeft: spacing.sm }}>→</Text> : null}
            </Pressable>

            {submitState.status === 'error' ? (
              <Text style={{ color: colors.error, fontSize: typography.fontSize.bodySm, marginTop: spacing.md, textAlign: 'center' }} testID="review-submit-error">
                {submitState.message}
              </Text>
            ) : null}

            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm, marginTop: spacing.md, textAlign: 'center' }}>
              Your review helps maintain our 5-star standard.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default ReviewScreen;
