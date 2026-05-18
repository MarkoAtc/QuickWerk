import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

function StepPill({ index, label, active }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.full,
          backgroundColor: active ? colors.secondaryBright : 'rgba(255,255,255,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold }}>{index}</Text>
      </View>
      <Text style={{ color: active ? '#FFFFFF' : colors.onPrimaryContainer, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
        {label}
      </Text>
    </View>
  );
}

function ShowcaseField({ label, value, onChangeText, placeholder, multiline = false, testID }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={{
          marginBottom: spacing.sm,
          color: colors.textMuted,
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          {
            minHeight: multiline ? 140 : 60,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            backgroundColor: '#FFFFFF',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            color: colors.text,
            fontSize: typography.fontSize.bodyMd,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        testID={testID}
        value={value}
      />
    </View>
  );
}

function ChecklistCard({ checklist, verificationState }) {
  return (
    <View
      style={{
        borderRadius: 32,
        padding: spacing.xl,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...shadow.card,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
        Verification readiness
      </Text>
      <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
        This block makes the onboarding feel concrete. It shows what is already strong and what still needs work before review.
      </Text>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {checklist.map((item) => (
          <View
            key={item.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              borderRadius: 20,
              padding: spacing.md,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: item.done ? colors.success : colors.surfaceContainerHigh,
              }}
            >
              <Text style={{ color: item.done ? '#FFFFFF' : colors.textMuted, fontSize: 12, fontWeight: typography.fontWeight.bold }}>
                {item.done ? '✓' : '•'}
              </Text>
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: typography.fontSize.bodyMd }}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: spacing.lg,
          borderRadius: 20,
          padding: spacing.md,
          backgroundColor: verificationState === 'submitted' ? '#ECFDF5' : '#FFFFFF',
          borderWidth: 1,
          borderColor: verificationState === 'submitted' ? '#BBF7D0' : colors.outlineVariant,
        }}
      >
        <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
          Current review state: {verificationState}
        </Text>
      </View>
    </View>
  );
}

export function ProviderOnboardingScreen({
  initialProfile = {},
  onSaveProfile,
  onSubmitVerification,
  verificationState = 'draft',
  isSaving = false,
  isSubmitting = false,
}) {
  const [businessName, setBusinessName] = useState(initialProfile.businessName ?? '');
  const [serviceArea, setServiceArea] = useState(initialProfile.serviceArea ?? '');
  const [tradeCategories, setTradeCategories] = useState((initialProfile.tradeCategories ?? []).join(', '));
  const [bio, setBio] = useState(initialProfile.bio ?? '');

  const checklist = useMemo(
    () => [
      { label: 'Business name is clearly defined', done: businessName.trim().length > 1 },
      { label: 'Service area is documented', done: serviceArea.trim().length > 1 },
      { label: 'Core trade categories are listed', done: tradeCategories.trim().length > 1 },
      { label: 'Provider story feels trustworthy', done: bio.trim().length > 10 },
    ],
    [bio, businessName, serviceArea, tradeCategories],
  );

  const completedSteps = checklist.filter((item) => item.done).length;
  const completionRatio = `${Math.min(100, Math.round((completedSteps / checklist.length) * 100))}%`;

  const handleSave = () => {
    onSaveProfile?.({
      businessName,
      serviceArea,
      tradeCategories: tradeCategories
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      bio,
    });
  };

  const handleSubmit = () => {
    onSubmitVerification?.();
  };

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        gap: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="provider-onboarding-screen"
    >
      <View
        style={{
          borderRadius: 36,
          padding: spacing.xl,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
      >
        <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase' }}>
          Provider application flow
        </Text>
        <Text
          style={{
            marginTop: spacing.md,
            color: '#FFFFFF',
            fontSize: 48,
            lineHeight: 52,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: -1,
            maxWidth: 760,
          }}
        >
          Build a provider profile that looks credible before anyone reviews it.
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
          This screen should feel like a premium onboarding experience, not an internal admin form. The provider needs a clear sense of progress, quality, and trust.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl }}>
          <StepPill active index="1" label="Business profile" />
          <StepPill active={completedSteps >= 2} index="2" label="Service footprint" />
          <StepPill active={completedSteps >= 4} index="3" label="Verification" />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Completion
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>{completionRatio}</Text>
          </View>
          <View
            style={{
              marginTop: spacing.sm,
              height: 6,
              borderRadius: radius.full,
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.10)',
            }}
          >
            <View style={{ width: completionRatio, height: '100%', backgroundColor: colors.secondaryBright }} />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: 1.2 }}>
          <View
            style={{
              borderRadius: 32,
              padding: spacing.xl,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
              ...shadow.card,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
              Company profile
            </Text>
            <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
              Shape the presentation so customers immediately understand who the provider is, where they operate, and why they should be trusted.
            </Text>

            <View style={{ marginTop: spacing.xl }}>
              <ShowcaseField
                label="Business name"
                onChangeText={setBusinessName}
                placeholder="QuickWerk Electrical GmbH"
                testID="provider-onboarding-business-name"
                value={businessName}
              />
              <ShowcaseField
                label="Service area"
                onChangeText={setServiceArea}
                placeholder="Vienna, Lower Austria"
                testID="provider-onboarding-service-area"
                value={serviceArea}
              />
              <ShowcaseField
                label="Trade categories"
                onChangeText={setTradeCategories}
                placeholder="Electrical, Emergency repair, Industrial maintenance"
                testID="provider-onboarding-trade-categories"
                value={tradeCategories}
              />
              <ShowcaseField
                label="Business bio"
                multiline
                onChangeText={setBio}
                placeholder="Describe what the provider specializes in, what quality signal exists, and why customers should trust the service."
                testID="provider-onboarding-bio"
                value={bio}
              />
            </View>
          </View>
        </View>

        <View style={{ flex: 0.85 }}>
          <ChecklistCard checklist={checklist} verificationState={verificationState} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Pressable accessibilityRole="button" disabled={isSaving} onPress={handleSave} testID="provider-onboarding-save-profile" style={{ flex: 1 }}>
          <View style={{ ...componentStyles.button.dark, minHeight: 60, opacity: isSaving ? 0.7 : 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              {isSaving ? 'Saving…' : 'Save profile draft'}
            </Text>
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={handleSubmit} testID="provider-onboarding-submit-verification" style={{ flex: 1 }}>
          <View style={{ ...componentStyles.button.primary, minHeight: 60, opacity: isSubmitting ? 0.7 : 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              {isSubmitting ? 'Submitting…' : 'Submit for verification'}
            </Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default ProviderOnboardingScreen;
