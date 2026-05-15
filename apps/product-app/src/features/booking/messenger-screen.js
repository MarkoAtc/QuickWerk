import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

function Bubble({ message }) {
  const mine = message.direction === 'outbound';

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '82%',
          borderRadius: 24,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          backgroundColor: mine ? colors.primaryContainer : colors.surface,
          borderWidth: mine ? 0 : 1,
          borderColor: mine ? 'transparent' : colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <Text
          style={{
            color: mine ? '#FFFFFF' : colors.text,
            fontSize: typography.fontSize.bodyMd,
            lineHeight: typography.lineHeight.bodyMd,
          }}
        >
          {message.body}
        </Text>
      </View>
      <Text
        style={{
          marginTop: spacing.xs,
          color: colors.textMuted,
          fontSize: typography.fontSize.labelSm,
        }}
      >
        {message.meta}
      </Text>
    </View>
  );
}

export function MessengerScreen({
  headline,
  subheadline,
  thread,
  composerValue,
  onComposerChange,
  onSend,
  bookingMeta,
  guidance,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="messenger-screen">
      <View
        style={{
          paddingHorizontal: spacing.container,
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
          backgroundColor: colors.primaryContainer,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 36,
            lineHeight: 40,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: -0.6,
          }}
        >
          {headline}
        </Text>
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.onPrimaryContainer,
            fontSize: typography.fontSize.bodyMd,
            lineHeight: typography.lineHeight.bodyMd,
            maxWidth: 720,
          }}
        >
          {subheadline}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.container,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
        style={{ flex: 1 }}
      >
        {bookingMeta ? (
          <View
            style={{
              borderRadius: 24,
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
              ...shadow.card,
            }}
          >
            <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}>
              Booking context
            </Text>
            <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodySm }}>
              {bookingMeta}
            </Text>
          </View>
        ) : null}

        {guidance ? (
          <View
            style={{
              borderRadius: 24,
              padding: spacing.lg,
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
            }}
          >
            <Text style={{ color: '#1D4ED8', fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
              {guidance}
            </Text>
          </View>
        ) : null}
        {thread.map((message, index) => (
          <Bubble key={`${message.meta}-${index}`} message={message} />
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.container,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
        }}
      >
        <View
          style={{
            borderRadius: 28,
            padding: spacing.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            ...shadow.card,
          }}
        >
          <TextInput
            value={composerValue}
            onChangeText={onComposerChange}
            placeholder="Write a message"
            placeholderTextColor={colors.textMuted}
            multiline
            testID="messenger-composer-input"
            style={{
              minHeight: 72,
              color: colors.text,
              textAlignVertical: 'top',
            }}
          />

          <Pressable accessibilityRole="button" onPress={onSend} testID="messenger-send-button">
            <View style={{ ...componentStyles.button.primary, marginTop: spacing.md }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: typography.fontSize.labelMd,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Send message
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default MessengerScreen;
