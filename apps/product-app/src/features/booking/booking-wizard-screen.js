import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

const URGENCY_OPTIONS = [
  {
    id: 'urgent',
    label: 'Urgent',
    icon: '⚡',
    helper: 'Provider arrives within 60 mins. Premium rate applies.',
    badge: 'Urgent Priority',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    icon: '📅',
    helper: 'Pick a specific time that works for your schedule.',
    badge: 'Select time',
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
      <Text style={{ color: colors.text, fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold }}>{title}</Text>
    </View>
  );
}

function Header({ onClose }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.container,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        backgroundColor: 'rgba(255,255,255,0.9)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} testID="booking-wizard-close">
          <Text style={{ color: colors.text, fontSize: 20 }}>✕</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold }}>New Request</Text>
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
  );
}

function LocationRow({ address, onEdit }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm, flexShrink: 1 }} numberOfLines={1}>
        📍 {address}
      </Text>
      <Pressable accessibilityRole="button" onPress={onEdit} testID="booking-wizard-edit-location">
        <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>Edit</Text>
      </Pressable>
    </View>
  );
}

function DescriptionSection({ description, onChangeDescription }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <SectionHeading index={1} title="Describe the issue" />
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surface,
          padding: spacing.md,
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

function UrgencyCard({ option, selected, onPress }) {
  return (
    <Pressable
      accessibilityLabel={option.label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onPress(option.id)}
      style={{ flex: 1 }}
      testID={`booking-wizard-urgency-${option.id}`}
    >
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? colors.secondaryBright : colors.outlineVariant,
          backgroundColor: colors.surface,
          padding: spacing.lg,
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

function UrgencySection({ urgency, onSelectUrgency }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <SectionHeading index={2} title="Select Urgency" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {URGENCY_OPTIONS.map((option) => (
          <UrgencyCard key={option.id} onPress={onSelectUrgency} option={option} selected={urgency === option.id} />
        ))}
      </View>
    </View>
  );
}

function PaymentRow({ icon, title, subtitle, selected, onPress, testID }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} testID={testID}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: radius.lg,
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? colors.secondaryBright : colors.outlineVariant,
          backgroundColor: colors.surface,
          padding: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          </View>
          <View>
            <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>{title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>{subtitle}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 18, color: selected ? colors.secondaryBright : colors.outlineVariant }}>{selected ? '✓' : '○'}</Text>
      </View>
    </Pressable>
  );
}

function PaymentSection({ paymentMethod, onSelectPaymentMethod }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <SectionHeading index={3} title="Payment Method" />
      <View style={{ gap: spacing.sm }}>
        <PaymentRow
          icon=""
          onPress={() => onSelectPaymentMethod('apple-pay')}
          selected={paymentMethod === 'apple-pay'}
          subtitle="Fast & secure"
          testID="booking-wizard-payment-apple-pay"
          title="Apple Pay"
        />
        <PaymentRow
          icon="＋"
          onPress={() => onSelectPaymentMethod('add-card')}
          selected={paymentMethod === 'add-card'}
          subtitle="No card on file yet"
          testID="booking-wizard-payment-add-card"
          title="Add a payment method"
        />
      </View>
    </View>
  );
}

function SummaryCard() {
  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: colors.primaryContainer,
        padding: spacing.lg,
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

export function BookingWizard({ category, address = DEFAULT_ADDRESS, onComplete, onBack, onEdit, isSubmitting = false }) {
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[0].id);
  const [paymentMethod, setPaymentMethod] = useState('add-card');

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

      <Header onClose={onBack} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.container, paddingTop: spacing.xl, paddingBottom: spacing.xl }}
        style={{ flex: 1 }}
      >
        <LocationRow address={address} onEdit={onEdit} />
        <DescriptionSection description={description} onChangeDescription={setDescription} />
        <UrgencySection onSelectUrgency={setUrgency} urgency={urgency} />
        <PaymentSection onSelectPaymentMethod={setPaymentMethod} paymentMethod={paymentMethod} />
        <SummaryCard />
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          backgroundColor: 'rgba(255,255,255,0.95)',
          paddingHorizontal: spacing.container,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        <Pressable
          accessibilityLabel={isSubmitting ? 'Sending booking request' : 'Confirm booking request'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm, busy: isSubmitting }}
          disabled={!canConfirm}
          onPress={handleConfirm}
          testID="booking-wizard-confirm"
        >
          <View style={{ ...componentStyles.button.primary, backgroundColor: colors.cta, opacity: canConfirm ? 1 : 0.5 }}>
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
  );
}

export default BookingWizard;
