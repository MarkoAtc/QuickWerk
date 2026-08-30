import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, spacing, typography } from '@quickwerk/ui';

import { useResponsiveLayout } from '../../shared/use-responsive-layout';
import { PhoneKeypad } from './phone-keypad';

const COUNTRY_CODE = '+1';
const NANP_PHONE_DIGITS = 10;

function formatPhoneDigits(digits) {
  if (!digits) {
    return '';
  }
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  return [area, prefix, line].filter(Boolean).join(' ');
}

export function PhoneEntryScreen({ onSendCode, isSending = false, error, onUseProviderSignIn, onLocalBrowserSignIn }) {
  const responsive = useResponsiveLayout();
  const [digits, setDigits] = useState('');

  const isSendDisabled = isSending || digits.length !== NANP_PHONE_DIGITS;
  const ctaLabel = isSending ? 'Sending...' : 'Send OTP';

  const handleDigit = (digit) => {
    if (digits.length >= 10) {
      return;
    }
    setDigits((current) => current + digit);
  };

  const handleBackspace = () => {
    setDigits((current) => current.slice(0, -1));
  };

  const handleSendCode = () => {
    if (isSendDisabled) {
      return;
    }
    onSendCode?.({ phone: `${COUNTRY_CODE}${digits}` });
  };

  const formattedDigits = useMemo(() => formatPhoneDigits(digits), [digits]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.primaryContainer }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: responsive.gutter,
          paddingTop: responsive.isPhone ? spacing.lg : spacing.xl,
          paddingBottom: spacing.lg,
          width: '100%',
          maxWidth: 440,
          alignSelf: 'center',
        }}
        style={{ flex: 1 }}
        testID="phone-entry-screen"
      >
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: responsive.isPhone ? 36 : 40,
              lineHeight: responsive.isPhone ? 40 : 44,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: -0.8,
            }}
          >
            QuickWerk
          </Text>
          <Text
            style={{
              marginTop: spacing.xs,
              color: colors.onPrimaryContainer,
              fontSize: typography.fontSize.bodyMd,
            }}
          >
            Enter your phone to continue
          </Text>
        </View>

        <View style={{ flexGrow: 1, justifyContent: 'center', gap: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: responsive.isPhone ? spacing.sm : spacing.md,
              borderRadius: radius.xl,
              padding: responsive.isPhone ? 12 : spacing.md,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingRight: responsive.isPhone ? 12 : spacing.md,
                borderRightWidth: 1,
                borderRightColor: 'rgba(199,198,204,0.2)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.semibold }}>
                {COUNTRY_CODE}
              </Text>
              <Text style={{ color: colors.onPrimaryContainer, fontSize: 12 }}>▾</Text>
            </View>
            <Text
              style={{
                flex: 1,
                color: digits ? '#FFFFFF' : 'rgba(128,131,147,0.6)',
                fontSize: responsive.isPhone ? 22 : typography.fontSize.headlineMd,
                fontWeight: typography.fontWeight.semibold,
              }}
              testID="phone-entry-value"
            >
              {formattedDigits || '(555) 000-0000'}
            </Text>
          </View>

          <PhoneKeypad onBackspace={handleBackspace} onDigit={handleDigit} />

          {error ? (
            <Text style={{ color: '#FCA5A5', fontSize: typography.fontSize.bodySm, textAlign: 'center' }}>{error}</Text>
          ) : null}

          <Pressable
            accessibilityLabel={ctaLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSendDisabled, busy: isSending }}
            disabled={isSendDisabled}
            onPress={handleSendCode}
            testID="phone-entry-send-otp"
          >
            <View style={{ ...componentStyles.button.primary, opacity: isSendDisabled ? 0.6 : 1 }}>
              <Text
                style={{
                  color: colors.onPrimary,
                  fontSize: typography.fontSize.labelMd,
                  fontWeight: typography.fontWeight.bold,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {ctaLabel}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: responsive.isPhone ? spacing.sm : spacing.md }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(199,198,204,0.15)' }} />
            <Text
              style={{
                color: colors.onPrimaryContainer,
                fontSize: typography.fontSize.labelSm,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
              }}
            >
              Or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(199,198,204,0.15)' }} />
          </View>

          {/* ponytail: Google/Apple rendered visually only — no OAuth backend exists in this repo yet. */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1, ...componentStyles.button.ghost, opacity: 0.5 }}>
              <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold }}>Google</Text>
            </View>
            <View style={{ flex: 1, ...componentStyles.button.ghost, opacity: 0.5 }}>
              <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold }}>Apple</Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={onUseProviderSignIn} testID="phone-entry-provider-link">
            <Text
              style={{
                color: colors.onPrimaryContainer,
                fontSize: typography.fontSize.bodySm,
                textAlign: 'center',
                textDecorationLine: 'underline',
              }}
            >
              Continue as a provider
            </Text>
          </Pressable>

          {onLocalBrowserSignIn ? (
            <Pressable accessibilityRole="button" onPress={onLocalBrowserSignIn} testID="phone-entry-local-browser-sign-in">
              <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodySm, textAlign: 'center' }}>
                Local browser test sign-in
              </Text>
            </Pressable>
          ) : null}

          <Text
            style={{
              color: colors.onPrimaryContainer,
              fontSize: typography.fontSize.bodySm,
              textAlign: 'center',
              opacity: 0.6,
              lineHeight: typography.lineHeight.bodySm,
            }}
          >
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default PhoneEntryScreen;
