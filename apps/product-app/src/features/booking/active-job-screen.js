import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

function TimelineStep({ step, isLast }) {
  const stateToColor = {
    done: colors.primary,
    active: colors.primary,
    pending: colors.muted,
  };

  const dotColor = stateToColor[step.state] ?? colors.muted;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ alignItems: 'center', width: 20 }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: radius.pill,
            backgroundColor: dotColor,
            opacity: step.state === 'pending' ? 0.35 : 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step.state === 'done' ? (
            <Text style={{ color: colors.surface, fontSize: 9, fontWeight: typography.fontWeight.bold }}>✓</Text>
          ) : null}
        </View>
        {!isLast ? (
          <View
            style={{
              width: 2,
              flex: 1,
              minHeight: 28,
              backgroundColor: step.state === 'pending' ? colors.muted : colors.primary,
              opacity: step.state === 'pending' ? 0.15 : 0.4,
              marginTop: 4,
            }}
          />
        ) : null}
      </View>

      <Text
        style={{
          color: step.state === 'pending' ? colors.muted : colors.text,
          fontSize: typography.fontSize.md,
          fontWeight: step.state === 'active' ? typography.fontWeight.semibold : typography.fontWeight.regular,
          paddingBottom: isLast ? 0 : spacing.lg,
        }}
      >
        {step.label}
      </Text>
    </View>
  );
}

export function ActiveJob({ viewModel, onChat, onCall, onRefresh }) {
  const hasProvider = viewModel.counterpartLabel === 'Provider' && viewModel.counterpartValue !== 'Not assigned yet';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.lg,
      }}
      testID="active-job-screen"
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.lg,
          ...shadow.soft,
          gap: spacing.sm,
        }}
      >
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

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.lg,
          ...shadow.soft,
          gap: spacing.sm,
        }}
      >
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>{viewModel.counterpartLabel}</Text>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
          {viewModel.counterpartValue}
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>{viewModel.paymentSummary}</Text>
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.lg,
          ...shadow.soft,
        }}
      >
        {viewModel.timeline.map((step, index) => (
          <TimelineStep key={step.id} step={step} isLast={index === viewModel.timeline.length - 1} />
        ))}
      </View>

      {viewModel.statusHistory.length > 0 ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: spacing.lg,
            ...shadow.soft,
            gap: spacing.xs,
          }}
        >
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

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <TouchableOpacity
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh booking status"
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            borderWidth: 2,
            borderColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ fontSize: 18 }}>↻</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onChat}
          accessibilityRole="button"
          accessibilityLabel="Open chat"
          disabled={!hasProvider}
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            borderWidth: 2,
            borderColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            opacity: hasProvider ? 1 : 0.5,
          }}
        >
          <Text style={{ fontSize: 22 }}>💬</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCall}
          accessibilityRole="button"
          accessibilityLabel={`Call ${viewModel.counterpartLabel.toLowerCase()}`}
          disabled={!hasProvider}
          style={{
            flex: 1,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            ...shadow.soft,
            opacity: hasProvider ? 1 : 0.5,
          }}
        >
          <Text style={{ fontSize: 18 }}>📞</Text>
          <Text style={{ color: colors.surface, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold }}>
            Call
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default ActiveJob;
