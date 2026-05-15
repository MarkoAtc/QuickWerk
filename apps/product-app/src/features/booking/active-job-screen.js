import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

function StatusPill({ label, tone }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: tone.background,
      }}
    >
      <Text
        style={{
          color: tone.text,
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

function resolveStatusTone(status) {
  if (status === 'accepted') {
    return { background: 'rgba(16,185,129,0.12)', text: '#047857' };
  }

  if (status === 'completed') {
    return { background: '#D1FAE5', text: '#065F46' };
  }

  if (status === 'declined') {
    return { background: colors.errorContainer, text: colors.onErrorContainer };
  }

  return { background: 'rgba(255,138,0,0.14)', text: colors.cta };
}

function MapStage({ statusLabel }) {
  return (
    <View
      style={{
        borderRadius: radius.sheet,
        overflow: 'hidden',
        minHeight: 250,
        backgroundColor: '#EEF3F8',
        borderWidth: 1,
        borderColor: '#DCE4EE',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: 'rgba(255,255,255,0.88)',
          borderWidth: 1,
          borderColor: 'rgba(199,198,204,0.35)',
        }}
      >
        <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
          Live booking status
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          top: 18,
          right: 16,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.primaryContainer,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
          {statusLabel}
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          top: 78,
          left: 46,
          width: 54,
          height: 54,
          borderRadius: radius.full,
          backgroundColor: colors.secondaryBright,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: '#FFFFFF',
          ...shadow.card,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 22 }}>🏠</Text>
      </View>

      <View
        style={{
          position: 'absolute',
          top: 108,
          left: 98,
          width: 120,
          height: 4,
          borderRadius: radius.full,
          backgroundColor: 'rgba(2, 102, 255, 0.28)',
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: 82,
          right: 48,
          width: 58,
          height: 58,
          borderRadius: radius.full,
          backgroundColor: colors.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: '#FFFFFF',
          ...shadow.elevated,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 18 }}>⚒</Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          borderRadius: radius.sheet,
          padding: spacing.lg,
          backgroundColor: 'rgba(255,255,255,0.88)',
          borderWidth: 1,
          borderColor: 'rgba(199,198,204,0.35)',
          ...shadow.card,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: typography.fontSize.headlineSm,
            lineHeight: typography.lineHeight.headlineSm,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Booking progress stays visible, not buried.
        </Text>
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.textMuted,
            fontSize: typography.fontSize.bodySm,
            lineHeight: typography.lineHeight.bodySm,
          }}
        >
          This view is the foundation for a richer live tracking experience, provider updates, and next-step actions.
        </Text>
      </View>
    </View>
  );
}

function Timeline({ items }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const dotColor = item.state === 'done' ? colors.success : item.state === 'active' ? colors.secondaryBright : colors.outlineVariant;
        const lineColor = item.state === 'done' ? colors.secondaryBright : colors.outlineVariant;

        return (
          <View key={item.id} style={{ flexDirection: 'row' }}>
            <View style={{ alignItems: 'center', marginRight: spacing.md }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: radius.full,
                  backgroundColor: dotColor,
                  marginTop: 4,
                }}
              />
              {!isLast ? (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    backgroundColor: lineColor,
                    opacity: 0.4,
                    marginTop: spacing.xs,
                    minHeight: 34,
                  }}
                />
              ) : null}
            </View>

            <View style={{ paddingBottom: isLast ? 0 : spacing.lg, flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.fontSize.bodyMd,
                  fontWeight: item.state === 'active' ? typography.fontWeight.bold : typography.fontWeight.semibold,
                }}
              >
                {item.label}
              </Text>
              <Text style={{ marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
                {item.state === 'done' ? 'Completed' : item.state === 'active' ? 'Current step' : 'Upcoming'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function InfoCard({ title, value, accent }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.xl,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(199,198,204,0.35)',
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
        {title}
      </Text>
      <Text
        style={{
          marginTop: spacing.sm,
          color: accent || colors.text,
          fontSize: typography.fontSize.bodyMd,
          lineHeight: typography.lineHeight.bodyMd,
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function ActiveJobScreen({ model, isRefreshing = false, onRefresh, onMessageCounterpart }) {
  const tone = resolveStatusTone(model.status);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="active-job-screen"
    >
      <View
        style={{
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
      >
        <StatusPill label={model.statusLabel} tone={tone} />

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
          {model.headline}
        </Text>
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.onPrimaryContainer,
            fontSize: typography.fontSize.bodyMd,
            lineHeight: typography.lineHeight.bodyMd,
          }}
        >
          {model.subheadline}
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <MapStage statusLabel={model.statusLabel} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <InfoCard title="Service" value={model.requestedService} />
        <InfoCard title={model.counterpartLabel} value={model.counterpartValue} accent={colors.secondaryBright} />
      </View>

      <View
        style={{
          marginTop: spacing.xl,
          borderRadius: 28,
          padding: spacing.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            lineHeight: 32,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          Booking timeline
        </Text>
        <Timeline items={model.timeline} />
      </View>

      <View
        style={{
          marginTop: spacing.xl,
          borderRadius: 28,
          padding: spacing.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
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
          Payment
        </Text>
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.text,
            fontSize: typography.fontSize.bodyMd,
            lineHeight: typography.lineHeight.bodyMd,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          {model.paymentSummary}
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {model.canContactCounterpart ? (
          <Pressable accessibilityRole="button" onPress={onMessageCounterpart} testID="active-job-contact-counterpart">
            <View style={componentStyles.button.dark}>
              <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
                Open booking conversation
              </Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable accessibilityRole="button" onPress={onRefresh} testID="active-job-refresh-status">
          <View style={{ ...componentStyles.button.ghost, opacity: isRefreshing ? 0.7 : 1 }}>
            <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              {isRefreshing ? 'Refreshing...' : 'Refresh status'}
            </Text>
          </View>
        </Pressable>
      </View>

      {model.statusHistory?.length ? (
        <View
          style={{
            marginTop: spacing.xl,
            borderRadius: radius.sheet,
            padding: spacing.lg,
            backgroundColor: colors.surfaceContainerLow,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: typography.fontSize.bodyMd,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Status history
          </Text>
          {model.statusHistory.map((entry) => (
            <Text key={entry} style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>
              • {entry}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

export default ActiveJobScreen;
