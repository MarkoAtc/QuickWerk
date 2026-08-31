import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, componentStyles, shadow, spacing, typography } from '@quickwerk/ui';
import { deriveMessengerLayout } from '../../shared/messenger-layout';
import { useResponsiveLayout } from '../../shared/use-responsive-layout';

function Bubble({ message, layout }) {
  const mine = message.direction === 'outbound';

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: layout.bubbleMaxWidth,
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
  const responsiveLayout = useResponsiveLayout();
  const layout = deriveMessengerLayout(responsiveLayout);
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="messenger-screen"
    >
      <View
        style={{
          paddingHorizontal: layout.contentGutter,
          paddingTop: Math.max(spacing.xl, insets.top + spacing.md),
          paddingBottom: spacing.lg,
          backgroundColor: colors.primaryContainer,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: layout.heroFontSize,
              lineHeight: layout.heroLineHeight,
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
      </View>

      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: layout.contentGutter,
          paddingTop: spacing.xl,
          paddingBottom: layout.composerPadding,
          gap: spacing.md,
        }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {bookingMeta ? (
          <View
            style={{
              borderRadius: 24,
              padding: layout.cardPadding,
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
              padding: layout.cardPadding,
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
          <Bubble key={`${message.meta}-${index}`} message={message} layout={layout} />
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: layout.contentGutter,
          paddingTop: spacing.md,
          paddingBottom: Math.max(layout.composerPadding, insets.bottom + 12),
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
        }}
      >
        <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
          <View
            style={{
              borderRadius: 28,
              padding: layout.cardPadding,
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
              minHeight: layout.composerMinHeight,
              maxHeight: 160,
              color: colors.text,
              textAlignVertical: 'top',
              fontSize: typography.fontSize.bodyMd,
              lineHeight: typography.lineHeight.bodyMd,
            }}
          />

          <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={onSend} testID="messenger-send-button">
            <View style={{ ...componentStyles.button.primary, marginTop: spacing.md, minHeight: layout.minimumControlHeight }}>
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
    </KeyboardAvoidingView>
  );
}

export default MessengerScreen;
