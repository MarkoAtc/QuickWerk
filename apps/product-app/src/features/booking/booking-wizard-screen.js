import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

const STEPS_BY_CATEGORY = {
  plumbing: [
    {
      id: 'issue',
      question: "What's the issue?",
      subtitle: 'Select the request type that best matches the real situation so the provider immediately understands the context.',
      options: [
        { id: 'burst-pipe', label: 'Burst Pipe', icon: '💧', tone: colors.cta },
        { id: 'blocked-drain', label: 'Blocked Drain', icon: '🚿', tone: colors.secondaryBright },
        { id: 'toilet-overflow', label: 'Toilet Overflow', icon: '🚽', tone: colors.warning },
        { id: 'no-hot-water', label: 'No Hot Water', icon: '🔥', tone: colors.cta },
        { id: 'severe-leak', label: 'Severe Leak', icon: '💦', tone: colors.secondaryBright },
        { id: 'something-else', label: 'Something Else', icon: '❓', tone: colors.textMuted },
      ],
    },
    {
      id: 'urgency',
      question: 'How urgent is it?',
      subtitle: 'Urgency changes provider expectations, timing, and how the booking should be prioritized in the flow.',
      options: [
        { id: 'emergency', label: 'Emergency', helper: 'Right now', icon: '🚨', tone: colors.cta },
        { id: 'today', label: 'Today', helper: 'Same day', icon: '⏰', tone: colors.warning },
        { id: 'this-week', label: 'This week', helper: 'Flexible timing', icon: '📅', tone: colors.secondaryBright },
        { id: 'schedule', label: 'Schedule', helper: 'Choose later', icon: '🗓', tone: colors.textMuted },
      ],
    },
  ],
  electrical: [
    {
      id: 'issue',
      question: "What's the issue?",
      subtitle: 'Choose the problem that best describes the situation so the request already feels qualified before provider outreach.',
      options: [
        { id: 'power-outage', label: 'Power Outage', icon: '⚡', tone: colors.warning },
        { id: 'sparking', label: 'Sparking', icon: '🔥', tone: colors.cta },
        { id: 'lighting-failure', label: 'Lighting Failure', icon: '💡', tone: colors.secondaryBright },
        { id: 'circuit-breaker', label: 'Breaker Tripped', icon: '🔌', tone: colors.secondaryBright },
        { id: 'outlet-dead', label: 'Dead Outlet', icon: '🖥️', tone: colors.textMuted },
        { id: 'something-else', label: 'Something Else', icon: '❓', tone: colors.textMuted },
      ],
    },
    {
      id: 'urgency',
      question: 'How urgent is it?',
      subtitle: 'Set the right response expectation before the request is sent into the marketplace.',
      options: [
        { id: 'emergency', label: 'Emergency', helper: 'Immediate hazard', icon: '🚨', tone: colors.cta },
        { id: 'today', label: 'Today', helper: 'Fast resolution', icon: '⏰', tone: colors.warning },
        { id: 'this-week', label: 'This week', helper: 'Planned visit', icon: '📅', tone: colors.secondaryBright },
        { id: 'schedule', label: 'Schedule', helper: 'Later timing', icon: '🗓', tone: colors.textMuted },
      ],
    },
  ],
  default: [
    {
      id: 'issue',
      question: 'What kind of help do you need?',
      subtitle: 'Start with the clearest possible framing of the request.',
      options: [
        { id: 'general-help', label: 'General help', icon: '🛠', tone: colors.secondaryBright },
        { id: 'repair', label: 'Repair', icon: '🔧', tone: colors.cta },
        { id: 'installation', label: 'Installation', icon: '📦', tone: colors.secondaryBright },
        { id: 'inspection', label: 'Inspection', icon: '📝', tone: colors.warning },
      ],
    },
    {
      id: 'urgency',
      question: 'How urgent is it?',
      subtitle: 'This helps shape provider expectations and the booking timeline.',
      options: [
        { id: 'today', label: 'Today', helper: 'Priority', icon: '⏰', tone: colors.warning },
        { id: 'this-week', label: 'This week', helper: 'Standard timing', icon: '📅', tone: colors.secondaryBright },
        { id: 'schedule', label: 'Schedule', helper: 'Flexible', icon: '🗓', tone: colors.textMuted },
      ],
    },
  ],
};

const DEFAULT_ADDRESS = '1010 Vienna, AT';

function ProgressHeader({ step, total, onBack }) {
  const progress = `${Math.min(100, Math.round((step / total) * 100))}%`;

  return (
    <View style={{ backgroundColor: colors.primaryContainer, paddingHorizontal: spacing.container, paddingTop: spacing.md, paddingBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" onPress={onBack} testID="booking-wizard-back">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.full,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18 }}>←</Text>
          </View>
        </Pressable>

        <View>
          <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.labelMd, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Booking flow
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold, textAlign: 'right' }}>
            Step {step} of {total}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: spacing.lg, height: 6, borderRadius: radius.full, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <View style={{ width: progress, height: '100%', backgroundColor: colors.secondaryBright }} />
      </View>
    </View>
  );
}

function OptionTile({ option, selected, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(option.id)} style={{ width: '48.6%' }} testID={`booking-option-${option.id}`}>
      <View
        style={{
          minHeight: 180,
          borderRadius: 32,
          padding: spacing.xl,
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: selected ? option.tone : colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: `${option.tone}14`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 26 }}>{option.icon}</Text>
        </View>

        <View>
          <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold, letterSpacing: -0.4 }}>
            {option.label}
          </Text>
          {option.helper ? (
            <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
              {option.helper}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function LocationCard({ address, onEdit, onConfirm, isSubmitting = false }) {
  return (
    <View>
      <View
        style={{
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 20,
                backgroundColor: `${colors.secondaryBright}14`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Service location
              </Text>
              <Text style={{ marginTop: spacing.xs, color: colors.text, fontSize: typography.fontSize.bodyLg, lineHeight: typography.lineHeight.bodyLg, fontWeight: typography.fontWeight.bold }}>
                {address}
              </Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={onEdit}>
            <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>Edit</Text>
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityLabel={isSubmitting ? 'Sending booking request' : 'Confirm booking request'} accessibilityRole="button" accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }} disabled={isSubmitting} onPress={onConfirm} testID="booking-wizard-confirm">
        <View style={{ ...componentStyles.button.primary, marginTop: spacing.xl, opacity: isSubmitting ? 0.7 : 1, minHeight: 64 }}>
          <Text style={{ color: colors.onPrimary, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {isSubmitting ? 'Sending request…' : 'Confirm & continue'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export function BookingWizard({ category, address = DEFAULT_ADDRESS, onComplete, onBack, onEdit, isSubmitting = false }) {
  const [step, setStep] = useState(0);
  const [issueType, setIssueType] = useState(null);
  const [urgency, setUrgency] = useState(null);
  const totalSteps = 3;

  const categoryKey = category && STEPS_BY_CATEGORY[category] ? category : 'default';
  const steps = STEPS_BY_CATEGORY[categoryKey];

  const handleBack = () => {
    if (step === 0) {
      onBack?.();
    } else {
      setStep((previous) => previous - 1);
    }
  };

  const handleOptionSelect = (optionId) => {
    if (step === 0) {
      setIssueType(optionId);
      setStep(1);
      return;
    }

    if (step === 1) {
      setUrgency(optionId);
      setStep(2);
    }
  };

  const handleConfirm = () => {
    onComplete?.({ issueType, urgency, address });
  };

  const currentStep = steps[step];
  const bookingSummary = [categoryKey, issueType, urgency].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProgressHeader onBack={handleBack} step={step + 1} total={totalSteps} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.container,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
        }}
        style={{ flex: 1 }}
        testID="booking-wizard-screen"
      >
        <View
          style={{
            borderRadius: 36,
            padding: spacing.xl,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            ...shadow.card,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 52,
              lineHeight: 56,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: -1,
              maxWidth: 860,
            }}
          >
            {step < 2 ? currentStep.question : 'Confirm your request'}
          </Text>
          <Text
            style={{
              marginTop: spacing.md,
              color: colors.textSoft,
              fontSize: typography.fontSize.bodyLg,
              lineHeight: typography.lineHeight.bodyLg,
              maxWidth: 760,
            }}
          >
            {step < 2
              ? currentStep.subtitle
              : 'Review the booking summary and send the request into the provider flow.'}
          </Text>

          {bookingSummary.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl }}>
              {bookingSummary.map((item) => (
                <View
                  key={item}
                  style={{
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    backgroundColor: colors.surfaceContainer,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold }}>
                    {String(item).replace(/-/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.xl }}>
          {step < 2 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.lg }}>
              {currentStep.options.map((option) => {
                const selected = step === 0 ? issueType === option.id : urgency === option.id;
                return <OptionTile key={option.id} onPress={handleOptionSelect} option={option} selected={selected} />;
              })}
            </View>
          ) : (
            <LocationCard address={address} onConfirm={handleConfirm} onEdit={onEdit} isSubmitting={isSubmitting} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default BookingWizard;
