import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

const TIMELINE_STEPS = [
  { id: 'dispatched', label: 'Dispatched', done: true },
  { id: 'arriving', label: 'Arriving', active: true },
  { id: 'in_progress', label: 'In Progress', done: false },
];

function MapPeek({ providerName, etaMin }) {
  return (
    <View
      style={{
        height: 220,
        backgroundColor: '#EDF2F0',
        borderRadius: radius.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#D5E4DC',
      }}
    >
      {/* Dashed route line placeholder */}
      <View
        style={{
          position: 'absolute',
          width: '50%',
          height: 2,
          borderStyle: 'dashed',
          borderWidth: 1,
          borderColor: colors.primary,
          opacity: 0.6,
          top: '45%',
          left: '20%',
        }}
      />

      {/* Provider pin */}
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: colors.surface,
            ...shadow.soft,
          }}
        >
          <Text style={{ color: colors.surface, fontSize: 20 }}>👷</Text>
        </View>

        {/* ETA badge */}
        <View
          style={{
            backgroundColor: colors.text,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <Text
            style={{
              color: colors.surface,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {etaMin} min
          </Text>
        </View>
      </View>

      {/* Home pin */}
      <View
        style={{
          position: 'absolute',
          right: '20%',
          bottom: '25%',
          width: 36,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.surface,
        }}
      >
        <Text style={{ fontSize: 16 }}>🏠</Text>
      </View>
    </View>
  );
}

function TimelineStep({ step, isLast }) {
  const dotColor = step.done || step.active ? colors.primary : colors.muted;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      {/* Dot + line column */}
      <View style={{ alignItems: 'center', width: 20 }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: radius.pill,
            backgroundColor: dotColor,
            opacity: step.active ? 1 : step.done ? 1 : 0.3,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step.done && (
            <Text style={{ color: colors.surface, fontSize: 9, fontWeight: typography.fontWeight.bold }}>✓</Text>
          )}
        </View>
        {!isLast && (
          <View
            style={{
              width: 2,
              flex: 1,
              minHeight: 28,
              backgroundColor: step.done ? colors.primary : colors.muted,
              opacity: step.done ? 0.4 : 0.15,
              marginTop: 4,
            }}
          />
        )}
      </View>

      {/* Label */}
      <Text
        style={{
          color: step.done || step.active ? colors.text : colors.muted,
          fontSize: typography.fontSize.md,
          fontWeight: step.active ? typography.fontWeight.semibold : typography.fontWeight.regular,
          paddingBottom: isLast ? 0 : spacing.lg,
          paddingTop: 0,
        }}
      >
        {step.label}
      </Text>
    </View>
  );
}

function DelayWarning({ delayMin }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: '#FDF0EC',
        borderRadius: radius.md,
        padding: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.critical,
        marginBottom: spacing.md,
      }}
    >
      <Text style={{ fontSize: 16 }}>⚠️</Text>
      <Text
        style={{
          color: colors.critical,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          flex: 1,
        }}
      >
        Provider delayed by traffic (+{delayMin} mins)
      </Text>
    </View>
  );
}

export function ActiveJob({ booking = {}, onChat, onCall }) {
  const {
    providerName = 'David',
    etaMin = 12,
    delayed = false,
    delayMin = 5,
  } = booking;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
      }}
      testID="active-job-screen"
    >
      {/* Map peek */}
      <MapPeek providerName={providerName} etaMin={etaMin} />

      {/* Provider banner */}
      <View style={{ marginBottom: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            {providerName} is arriving soon
          </Text>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.pill,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.surface, fontSize: 11, fontWeight: typography.fontWeight.bold }}>✓</Text>
          </View>
        </View>
        <Text style={{ color: colors.muted, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
          Estimated arrival in {etaMin} minutes
        </Text>
      </View>

      {/* Delay warning */}
      {delayed && <DelayWarning delayMin={delayMin} />}

      {/* Timeline */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          ...shadow.soft,
        }}
      >
        {TIMELINE_STEPS.map((step, index) => (
          <TimelineStep
            key={step.id}
            step={step}
            isLast={index === TIMELINE_STEPS.length - 1}
          />
        ))}
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <TouchableOpacity
          onPress={onChat}
          accessibilityRole="button"
          accessibilityLabel="Open chat"
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
          <Text style={{ fontSize: 22 }}>💬</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCall}
          accessibilityRole="button"
          accessibilityLabel={`Call ${providerName}`}
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
          }}
        >
          <Text style={{ fontSize: 18 }}>📞</Text>
          <Text
            style={{
              color: colors.surface,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            Call {providerName}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default ActiveJob;
