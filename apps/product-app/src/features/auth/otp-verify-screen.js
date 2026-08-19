import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, spacing, typography } from '@quickwerk/ui';

import { PhoneKeypad } from './phone-keypad';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

function CodeDigitBox({ filled }) {
  return (
    <View
      style={{
        width: 44,
        height: 56,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: filled ? colors.secondaryBright : 'rgba(255,255,255,0.08)',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.headlineMd, fontWeight: typography.fontWeight.semibold }}>
        {filled ?? ''}
      </Text>
    </View>
  );
}

export function OtpVerifyScreen({ phone, devOtpCode, isVerifying = false, error, onVerify, onResend, onBack }) {
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isVerifyDisabled = isVerifying || code.length !== CODE_LENGTH;

  const handleDigit = (digit) => {
    if (code.length >= CODE_LENGTH) {
      return;
    }
    setCode((current) => current + digit);
  };

  const handleBackspace = () => {
    setCode((current) => current.slice(0, -1));
  };

  const handleVerify = () => {
    if (isVerifyDisabled) {
      return;
    }
    onVerify?.({ code });
  };

  const handleResend = () => {
    if (cooldown > 0) {
      return;
    }
    setCode('');
    setCooldown(RESEND_COOLDOWN_SECONDS);
    onResend?.();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.primaryContainer }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.container,
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
          width: '100%',
          maxWidth: 420,
          alignSelf: 'center',
        }}
        style={{ flex: 1 }}
        testID="otp-verify-screen"
      >
        <Pressable accessibilityRole="button" onPress={onBack} testID="otp-verify-back">
          <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodySm }}>← Change number</Text>
        </Pressable>

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: typography.fontSize.headlineLg,
              lineHeight: typography.lineHeight.headlineLg,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            Verify your number
          </Text>
          <Text style={{ marginTop: spacing.xs, color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodyMd }}>
            Enter the 6-digit code sent to {phone}
          </Text>
          {devOtpCode ? (
            <Text style={{ marginTop: spacing.sm, color: colors.secondaryBright, fontSize: typography.fontSize.bodySm }} testID="otp-verify-dev-code">
              {/* ponytail: no SMS provider wired up; surfacing the demo code inline keeps the flow completable. */}
              Dev code (no SMS provider configured): {devOtpCode}
            </Text>
          ) : null}
        </View>

        <View style={{ flexGrow: 1, justifyContent: 'center', gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <CodeDigitBox filled={code[index]} key={`code-digit-${index}`} />
            ))}
          </View>

          <PhoneKeypad onBackspace={handleBackspace} onDigit={handleDigit} />

          {error ? (
            <Text style={{ color: '#FCA5A5', fontSize: typography.fontSize.bodySm, textAlign: 'center' }}>{error}</Text>
          ) : null}

          <Pressable
            accessibilityLabel={isVerifying ? 'Verifying...' : 'Verify'}
            accessibilityRole="button"
            accessibilityState={{ disabled: isVerifyDisabled, busy: isVerifying }}
            disabled={isVerifyDisabled}
            onPress={handleVerify}
            testID="otp-verify-submit"
          >
            <View style={{ ...componentStyles.button.primary, opacity: isVerifyDisabled ? 0.6 : 1 }}>
              <Text
                style={{
                  color: colors.onPrimary,
                  fontSize: typography.fontSize.labelMd,
                  fontWeight: typography.fontWeight.bold,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Text>
            </View>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={cooldown > 0} onPress={handleResend} testID="otp-verify-resend">
            <Text
              style={{
                color: cooldown > 0 ? colors.onPrimaryContainer : colors.secondaryBright,
                fontSize: typography.fontSize.bodySm,
                textAlign: 'center',
                opacity: cooldown > 0 ? 0.6 : 1,
              }}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default OtpVerifyScreen;
