import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, componentStyles, layout, radius, shadow, spacing, typography } from '@quickwerk/ui';

function RoleCard({ role, selected, onPress }) {
  const isCustomer = role === 'customer';
  const icon = isCustomer ? '⌂' : '⚒';
  const title = isCustomer ? 'I need help' : 'I am a pro';
  const subtitle = isCustomer ? 'Customer' : 'Provider';

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(role)}
      style={{ flex: 1 }}
      testID={`auth-entry-role-${role}`}
    >
      <View
        style={{
          minHeight: 124,
          borderRadius: radius.xl,
          padding: spacing.md,
          justifyContent: 'space-between',
          backgroundColor: selected ? 'rgba(2, 102, 255, 0.10)' : 'rgba(255, 255, 255, 0.04)',
          borderWidth: 1.5,
          borderColor: selected ? colors.secondaryBright : 'rgba(255,255,255,0.08)',
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? colors.secondaryBright : 'rgba(255,255,255,0.06)',
          }}
        >
          <Text style={{ fontSize: 22, color: '#FFFFFF' }}>{icon}</Text>
        </View>

        <View>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: typography.fontSize.bodyMd,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: colors.onPrimaryContainer,
              fontSize: typography.fontSize.labelMd,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function KeyTrustItem({ label }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.medium,
        }}
      >
        ✓ {label}
      </Text>
    </View>
  );
}

function AuthField({ label, ...props }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          color: colors.onPrimaryContainer,
          fontSize: typography.fontSize.labelMd,
          fontWeight: typography.fontWeight.semibold,
          marginBottom: spacing.sm,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor="rgba(128, 131, 147, 0.6)"
        style={componentStyles.input.darkGlass}
        {...props}
      />
    </View>
  );
}

export function AuthEntryScreen({ onSignIn, onCreateAccount, isSigningIn = false }) {
  const [role, setRole] = useState('customer');
  const [mode, setMode] = useState('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const title = mode === 'sign-in' ? 'Welcome back.' : 'Create your account.';
  const subtitle =
    mode === 'sign-in'
      ? 'Sign in to book trusted professionals or manage incoming work.'
      : 'Join QuickWerk and get access to verified local service professionals.';

  const isSignInDisabled = isSigningIn || !email.trim() || !password;
  const isCreateDisabled = isSigningIn || !fullName.trim() || !email.trim() || !password;

  const ctaLabel = useMemo(() => {
    if (mode === 'sign-in') {
      return isSigningIn ? 'Signing in...' : 'Continue';
    }
    return isSigningIn ? 'Creating account...' : 'Create account';
  }, [isSigningIn, mode]);

  const handlePrimaryAction = () => {
    if (mode === 'sign-in') {
      onSignIn?.({ email, password, role });
      return;
    }

    onCreateAccount?.({ name: fullName, email, password, role });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.primaryContainer }}>
      <View style={{ height: layout.progressHeight, backgroundColor: 'rgba(2, 102, 255, 0.20)' }}>
        <View style={{ width: '34%', height: '100%', backgroundColor: colors.secondaryBright }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.container,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xxl,
          width: '100%',
          maxWidth: 1100,
          alignSelf: 'center',
        }}
        style={{ flex: 1 }}
        testID="auth-entry-screen"
      >
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 18,
              lineHeight: 22,
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            QuickWerk
          </Text>
          <Text
            style={{
              marginTop: spacing.xs,
              color: colors.onPrimaryContainer,
              fontSize: typography.fontSize.bodyMd,
              lineHeight: typography.lineHeight.bodyMd,
            }}
          >
            Premium skilled help, exactly when you need it.
          </Text>
        </View>

        <View
          style={{
            position: 'absolute',
            top: 20,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 999,
            backgroundColor: 'rgba(2, 102, 255, 0.10)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 260,
            left: -80,
            width: 220,
            height: 220,
            borderRadius: 999,
            backgroundColor: 'rgba(2, 102, 255, 0.04)',
          }}
        />

        <View style={{ marginBottom: spacing.xl, maxWidth: 760 }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 56,
              lineHeight: 60,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: -1.2,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              marginTop: spacing.sm,
              color: colors.onPrimaryContainer,
              fontSize: typography.fontSize.bodyMd,
              lineHeight: typography.lineHeight.bodyMd,
              maxWidth: 340,
            }}
          >
            {subtitle}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'stretch' }}>
          <View style={{ flex: 1.05 }}>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
              <RoleCard role="customer" selected={role === 'customer'} onPress={setRole} />
              <RoleCard role="provider" selected={role === 'provider'} onPress={setRole} />
            </View>

            <View
              style={{
                borderRadius: 32,
                padding: spacing.xl,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                ...shadow.overlay,
              }}
            >
          <View
            style={{
              flexDirection: 'row',
              marginBottom: spacing.lg,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: radius.full,
              padding: 4,
            }}
          >
            {[
              { id: 'sign-in', label: 'Sign in' },
              { id: 'create-account', label: 'Create account' },
            ].map((option) => {
              const selected = mode === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setMode(option.id)}
                  style={{ flex: 1 }}
                  testID={`auth-entry-mode-${option.id}`}
                >
                  <View
                    style={{
                      height: 44,
                      borderRadius: radius.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.secondaryBright : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: typography.fontSize.bodySm,
                        fontWeight: typography.fontWeight.semibold,
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {mode === 'create-account' ? (
            <AuthField
              accessibilityLabel="Full name"
              editable={!isSigningIn}
              onChangeText={setFullName}
              placeholder="Marta Meister"
              testID="auth-entry-full-name"
              value={fullName}
            />
          ) : null}

          <AuthField
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSigningIn}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            testID="auth-entry-email"
            value={email}
          />

          <AuthField
            accessibilityLabel="Password"
            editable={!isSigningIn}
            label="Password"
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            testID="auth-entry-password"
            value={password}
          />

          {mode === 'create-account' && role !== 'customer' ? (
            <View
              style={{
                borderRadius: radius.lg,
                padding: spacing.md,
                backgroundColor: 'rgba(255, 138, 0, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(255, 138, 0, 0.24)',
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ color: '#FFD8B0', fontSize: typography.fontSize.bodySm }}>
                Provider account creation is not available yet. Providers can currently use sign-in only.
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityLabel={ctaLabel}
            accessibilityRole="button"
            accessibilityState={{
              disabled: mode === 'sign-in' ? isSignInDisabled : isCreateDisabled,
              busy: isSigningIn,
            }}
            disabled={mode === 'sign-in' ? isSignInDisabled : isCreateDisabled}
            onPress={handlePrimaryAction}
            testID={mode === 'sign-in' ? 'auth-entry-sign-in' : 'auth-entry-create-account'}
          >
            <View
              style={{
                ...componentStyles.button.primary,
                opacity: mode === 'sign-in' ? (isSignInDisabled ? 0.6 : 1) : isCreateDisabled ? 0.6 : 1,
                marginTop: spacing.sm,
              }}
            >
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

          <Text
            style={{
              marginTop: spacing.md,
              color: colors.onPrimaryContainer,
              fontSize: typography.fontSize.bodySm,
              textAlign: 'center',
              lineHeight: typography.lineHeight.bodySm,
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
            </View>
          </View>

          <View
            style={{
              flex: 0.95,
              borderRadius: 32,
              padding: spacing.xl,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              justifyContent: 'space-between',
              minHeight: 520,
            }}
          >
            <View>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 32,
                  lineHeight: 36,
                  fontWeight: typography.fontWeight.bold,
                  letterSpacing: -0.6,
                }}
              >
                Premium local service, without the ugly marketplace chaos.
              </Text>
              <Text
                style={{
                  marginTop: spacing.md,
                  color: colors.onPrimaryContainer,
                  fontSize: typography.fontSize.bodyMd,
                  lineHeight: typography.lineHeight.bodyMd,
                }}
              >
                QuickWerk should feel sharper, calmer, and more credible than the average handwerker portal. This panel is now the visual target for the rest of the experience.
              </Text>
            </View>

            <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
              <KeyTrustItem label="Verified professionals" />
              <KeyTrustItem label="Secure payments" />
              <KeyTrustItem label="Fast support" />
            </View>

            <View
              style={{
                marginTop: spacing.xl,
                borderRadius: 24,
                padding: spacing.lg,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: colors.onPrimaryContainer,
                  fontSize: typography.fontSize.labelMd,
                  fontWeight: typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Current direction
              </Text>
              <Text style={{ marginTop: spacing.sm, color: '#FFFFFF', fontSize: 26, lineHeight: 30, fontWeight: typography.fontWeight.bold }}>
                Cleaner booking, stronger trust, sharper provider quality.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default AuthEntryScreen;
