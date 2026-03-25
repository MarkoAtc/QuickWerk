import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

const STEPS = [
  {
    id: 'issue',
    question: "What's the main issue?",
    subtitle: 'Select the option that best describes your plumbing emergency.',
    options: [
      { id: 'burst-pipe', label: 'Burst Pipe', icon: '💧' },
      { id: 'blocked-drain', label: 'Blocked Drain', icon: '🚿' },
      { id: 'toilet-overflow', label: 'Toilet Overflow', icon: '🚽' },
      { id: 'no-hot-water', label: 'No Hot Water', icon: '🔥' },
      { id: 'severe-leak', label: 'Severe Leak', icon: '💦' },
      { id: 'something-else', label: 'Something Else', icon: '❓' },
    ],
  },
  {
    id: 'urgency',
    question: "How urgent is it?",
    subtitle: "We'll match you with the right availability.",
    options: [
      { id: 'emergency', label: 'Emergency (now)', icon: '🚨' },
      { id: 'today', label: 'Today', icon: '⏰' },
      { id: 'this-week', label: 'This week', icon: '📅' },
      { id: 'schedule', label: 'Schedule it', icon: '🗓' },
    ],
  },
];

const DEFAULT_ADDRESS = '1010 Vienna, AT';

function ProgressBar({ step, total }) {
  return (
    <View
      style={{
        height: 4,
        backgroundColor: colors.muted,
        borderRadius: radius.pill,
        overflow: 'hidden',
        marginTop: spacing.sm,
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${(step / total) * 100}%`,
          backgroundColor: colors.primary,
          borderRadius: radius.pill,
        }}
      />
    </View>
  );
}

function OptionTile({ option, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={() => onPress(option.id)}
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityState={{ selected }}
      activeOpacity={0.85}
      style={{
        flex: 1,
        height: 120,
        backgroundColor: selected ? '#E8F5EE' : colors.surface,
        borderRadius: radius.card,
        borderWidth: 2,
        borderColor: selected ? colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        ...shadow.soft,
      }}
    >
      <Text style={{ fontSize: 28 }}>{option.icon}</Text>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          textAlign: 'center',
          paddingHorizontal: spacing.xs,
        }}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );
}

function LocationStep({ address, onEdit, onConfirm }) {
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Location: ${address}. Tap to edit.`}
        onPress={onEdit ?? (() => {})}
        activeOpacity={0.85}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: colors.muted,
          marginBottom: spacing.xl,
          ...shadow.soft,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text style={{ fontSize: 24 }}>📍</Text>
          <View>
            <Text
              style={{
                color: colors.muted,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.medium,
                letterSpacing: 1,
                marginBottom: 2,
              }}
            >
              YOUR LOCATION
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {address}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
          Edit
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Confirm and find pros"
        onPress={onConfirm ?? (() => {})}
        testID="booking-wizard-confirm"
        activeOpacity={0.85}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.pill,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadow.soft,
        }}
      >
        <Text
          style={{
            color: colors.surface,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          Confirm & Find Pros
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function BookingWizard({ category, onComplete, onBack }) {
  const [step, setStep] = useState(0);
  const [issueType, setIssueType] = useState(null);
  const [urgency, setUrgency] = useState(null);
  const address = DEFAULT_ADDRESS;
  const totalSteps = 3;

  const handleBack = () => {
    if (step === 0) {
      if (onBack) onBack();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleOptionSelect = (optionId) => {
    if (step === 0) {
      setIssueType(optionId);
      setStep(1);
    } else if (step === 1) {
      setUrgency(optionId);
      setStep(2);
    }
  };

  const handleConfirm = () => {
    if (onComplete) {
      onComplete({ issueType, urgency, address });
    }
  };

  const currentStep = STEPS[step];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            testID="booking-wizard-back"
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.muted,
              marginRight: spacing.md,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text
            style={{
              color: colors.muted,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            Step {step + 1} of {totalSteps}
          </Text>
        </View>
        <ProgressBar step={step + 1} total={totalSteps} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
        }}
        testID="booking-wizard-screen"
      >
        {step < 2 ? (
          <>
            {/* Step question */}
            <Text
              style={{
                color: colors.text,
                fontSize: typography.fontSize.xxl,
                fontWeight: typography.fontWeight.bold,
                lineHeight: 36,
                marginBottom: spacing.sm,
              }}
            >
              {currentStep.question}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: typography.fontSize.sm,
                lineHeight: 20,
                marginBottom: spacing.xl,
              }}
            >
              {currentStep.subtitle}
            </Text>

            {/* Options grid — 2 columns */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {currentStep.options.map((option, index) => {
                const isLeftColumn = index % 2 === 0;
                const selected = step === 0 ? issueType === option.id : urgency === option.id;
                return (
                  <View key={option.id} style={{ width: '47%' }}>
                    <OptionTile
                      option={option}
                      selected={selected}
                      onPress={handleOptionSelect}
                    />
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Step 3: Location confirm */}
            <Text
              style={{
                color: colors.text,
                fontSize: typography.fontSize.xxl,
                fontWeight: typography.fontWeight.bold,
                lineHeight: 36,
                marginBottom: spacing.sm,
              }}
            >
              Confirm your location
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: typography.fontSize.sm,
                lineHeight: 20,
                marginBottom: spacing.xl,
              }}
            >
              We'll send pros to this address.
            </Text>
            <LocationStep address={address} onConfirm={handleConfirm} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default BookingWizard;
