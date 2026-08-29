import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

import {
  deriveCustomerBookingLayout,
  resolveCustomerBookingBottomPadding,
} from '../../shared/customer-booking-layout';
import { useResponsiveLayout } from '../../shared/use-responsive-layout';

const URGENCY_OPTIONS = [
  {
    id: 'urgent',
    label: 'Urgent',
    icon: '⚡',
    helper: 'Provider arrives within 60 mins. Premium rate applies.',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: '📅',
    helper: "We'll coordinate a time with your provider after you submit.",
  },
];

const DEFAULT_ADDRESS = '1010 Vienna, AT';

function SectionHeading({ index, title }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.full,
          backgroundColor: colors.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold }}>{index}</Text>
      </View>
      <Text
        style={{ color: colors.text, flex: 1, fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold }}
      >
        {title}
      </Text>
    </View>
  );
}

function Header({ layout, onClose, topInset }) {
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: layout.contentGutter,
        paddingTop: Math.max(spacing.md, topInset + 4),
        paddingBottom: spacing.md,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingRight: spacing.sm }}>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} testID="booking-wizard-close">
            <Text style={{ color: colors.text, fontSize: 20 }}>✕</Text>
          </Pressable>
          <Text
            style={{ color: colors.text, flexShrink: 1, fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold }}
          >
            New Request
          </Text>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.full,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14 }}>👤</Text>
        </View>
      </View>
    </View>
  );
}

function LocationRow({ address, onEdit }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, flex: 1, lineHeight: typography.lineHeight.bodySm }}>
        📍 {address}
      </Text>
      <Pressable accessibilityRole="button" onPress={onEdit} style={{ marginLeft: spacing.md }} testID="booking-wizard-edit-location">
        <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>Edit</Text>
      </Pressable>
    </View>
  );
}

function DescriptionSection({ description, layout, onChangeDescription }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <SectionHeading index={1} title="Describe the issue" />
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surface,
          padding: layout.cardPadding,
          ...shadow.card,
        }}
      >
        <TextInput
          multiline
          onChangeText={onChangeDescription}
          placeholder="E.g. Kitchen sink is leaking from the main pipe. Need urgent repair before tonight."
          placeholderTextColor={colors.textMuted}
          style={{ minHeight: 100, fontSize: typography.fontSize.bodyMd, color: colors.text, textAlignVertical: 'top' }}
          testID="booking-wizard-description"
          value={description}
        />
        <Pressable accessibilityLabel="Add photos" accessibilityRole="button" style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Text style={{ fontSize: 16 }}>📷</Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold }}>Add Photos</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function UrgencyCard({ layout, option, selected, onPress }) {
  return (
    <Pressable
      accessibilityLabel={option.label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onPress(option.id)}
      style={{ flex: layout.urgencyDirection === 'row' ? 1 : undefined }}
      testID={`booking-wizard-urgency-${option.id}`}
    >
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? colors.secondaryBright : colors.outlineVariant,
          backgroundColor: colors.surface,
          padding: layout.cardPadding,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 22 }}>{option.icon}</Text>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: selected ? colors.secondaryBright : colors.outlineVariant,
              backgroundColor: selected ? colors.secondaryBright : 'transparent',
            }}
          />
        </View>
        <Text style={{ marginTop: spacing.sm, color: colors.text, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold }}>
          {option.label}
        </Text>
        <Text style={{ marginTop: 2, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>{option.helper}</Text>
      </View>
    </Pressable>
  );
}

function UrgencySection({ layout, urgency, onSelectUrgency }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <SectionHeading index={2} title="Select Urgency" />
      <View style={{ flexDirection: layout.urgencyDirection, gap: spacing.md }}>
        {URGENCY_OPTIONS.map((option) => (
          <UrgencyCard key={option.id} layout={layout} onPress={onSelectUrgency} option={option} selected={urgency === option.id} />
        ))}
      </View>
    </View>
  );
}

function PaymentSection({ layout }) {
  return (
    <View style={{ marginBottom: spacing.xl }} testID="booking-wizard-payment-note">
      <SectionHeading index={3} title="Payment Method" />
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surfaceContainer,
          padding: layout.cardPadding,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
          You'll choose how to pay once a provider accepts this job — nothing to set up now.
        </Text>
      </View>
    </View>
  );
}

function SummaryCard({ layout }) {
  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: colors.primaryContainer,
        padding: layout.cardPadding,
        marginBottom: spacing.xl,
      }}
      testID="booking-wizard-summary"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <Text style={{ fontSize: 16 }}>ℹ️</Text>
        <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm, flex: 1 }}>
          Your provider confirms final pricing based on materials and labor time before any work starts — nothing is
          charged when you submit this request.
        </Text>
      </View>
    </View>
  );
}

export function BookingWizard({
  category,
  address = DEFAULT_ADDRESS,
  onComplete,
  onBack,
  onEdit,
  isSubmitting = false,
  errorMessage,
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const layout = deriveCustomerBookingLayout(useResponsiveLayout());
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[0].id);

  const canConfirm = description.trim().length > 0 && !isSubmitting;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onComplete?.({ issueType: description.trim(), urgency, address, category });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="booking-wizard-screen">
      <View style={{ height: 3, backgroundColor: colors.outlineVariant }}>
        <View style={{ width: '66%', height: '100%', backgroundColor: colors.secondaryBright }} />
      </View>

      <Header layout={layout} onClose={onBack} topInset={safeAreaInsets.top} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: layout.contentGutter, paddingTop: spacing.xl, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
          <LocationRow address={address} onEdit={onEdit} />
          <DescriptionSection description={description} layout={layout} onChangeDescription={setDescription} />
          <UrgencySection layout={layout} onSelectUrgency={setUrgency} urgency={urgency} />
          <PaymentSection layout={layout} />
          <SummaryCard layout={layout} />
          {errorMessage ? (
            <View
              style={{
                backgroundColor: 'rgba(186, 26, 26, 0.08)',
                borderColor: 'rgba(186, 26, 26, 0.2)',
                borderRadius: radius.md,
                borderWidth: 1,
                padding: spacing.md,
              }}
              testID="booking-wizard-error"
            >
              <Text style={{ color: colors.error, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          backgroundColor: 'rgba(255,255,255,0.95)',
          paddingHorizontal: layout.contentGutter,
          paddingTop: spacing.md,
          paddingBottom: resolveCustomerBookingBottomPadding(layout, safeAreaInsets.bottom),
        }}
      >
        <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
          <Pressable
            accessibilityLabel={isSubmitting ? 'Sending booking request' : 'Confirm booking request'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirm, busy: isSubmitting }}
            disabled={!canConfirm}
            onPress={handleConfirm}
            testID="booking-wizard-confirm"
          >
            <View
              style={{
                ...componentStyles.button.primary,
                minHeight: layout.minimumControlHeight,
                backgroundColor: colors.cta,
                opacity: canConfirm ? 1 : 0.5,
              }}
            >
              <Text style={{ color: colors.onPrimary, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
                {isSubmitting ? 'Sending request…' : 'Confirm Booking →'}
              </Text>
            </View>
          </Pressable>
          <Text style={{ marginTop: spacing.sm, textAlign: 'center', color: colors.textMuted, fontSize: typography.fontSize.labelSm }}>
            By confirming, you agree to our Service Terms
          </Text>
        </View>
      </View>
    </View>
  );
}

export default BookingWizard;
