import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

function RoleCard({ role, selected, onPress }) {
  const isCustomer = role === 'customer';
  return (
    <TouchableOpacity
      onPress={() => onPress(role)}
      accessibilityRole="button"
      accessibilityLabel={isCustomer ? 'I need help, customer' : 'I am a pro, provider'}
      accessibilityState={{ selected }}
      activeOpacity={0.85}
      style={{
        flex: 1,
        height: 100,
        backgroundColor: selected ? '#E8F5EE' : colors.surface,
        borderRadius: radius.card,
        borderWidth: 2,
        borderColor: selected ? colors.primary : colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        ...shadow.soft,
      }}
    >
      <Text style={{ fontSize: 28, marginBottom: spacing.xs }}>{isCustomer ? '🏠' : '🧰'}</Text>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        {isCustomer ? 'I need help' : 'I am a pro'}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: typography.fontSize.xs,
          letterSpacing: 1,
          marginTop: 2,
        }}
      >
        {isCustomer ? 'CUSTOMER' : 'PROVIDER'}
      </Text>
    </TouchableOpacity>
  );
}

function OrDivider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.muted, opacity: 0.3 }} />
      <Text
        style={{
          marginHorizontal: spacing.md,
          color: colors.muted,
          fontSize: typography.fontSize.sm,
        }}
      >
        or
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.muted, opacity: 0.3 }} />
    </View>
  );
}

function TrustBadge({ label }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: colors.accent,
      }}
    >
      <Text style={{ color: colors.accent, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>
        ✓ {label}
      </Text>
    </View>
  );
}

export function AuthEntryScreen({ onSignIn, onCreateAccount, isSigningIn = false }) {
  const [role, setRole] = useState('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isSignInDisabled = isSigningIn || !email.trim() || !password;
  const isCreateAccountDisabled = isSigningIn || !fullName.trim() || !email.trim() || !password;

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn({ email, password, role });
    }
  };

  const handleCreateAccount = () => {
    if (onCreateAccount) {
      onCreateAccount({ name: fullName, email, password, role });
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      testID="auth-entry-screen"
    >
      {/* Wordmark + tagline */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          QuickWerk
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: typography.fontSize.xs,
            letterSpacing: 1,
            marginTop: 2,
          }}
        >
          Trusted help, fast.
        </Text>
      </View>

      {/* Hero heading */}
      <Text
        style={{
          color: colors.text,
          fontSize: 36,
          fontWeight: typography.fontWeight.bold,
          lineHeight: 44,
          marginBottom: spacing.sm,
        }}
      >
        Help is one{'\n'}tap away.
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: typography.fontSize.sm,
          lineHeight: 20,
          marginBottom: spacing.xl,
        }}
      >
        Access local experts for every emergency, delivered with precision.
      </Text>

      {/* Role selector cards */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <RoleCard role="customer" selected={role === 'customer'} onPress={setRole} />
        <RoleCard role="provider" selected={role === 'provider'} onPress={setRole} />
      </View>

      {/* Divider */}
      <OrDivider />

      {/* Email input */}
      <TextInput
        accessibilityLabel="Full name"
        editable={!isSigningIn}
        onChangeText={setFullName}
        placeholder="Full Name"
        placeholderTextColor={colors.muted}
        testID="auth-entry-full-name"
        value={fullName}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.muted,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          fontSize: typography.fontSize.md,
          color: colors.text,
          marginBottom: spacing.sm,
        }}
      />

      {/* Email input */}
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isSigningIn}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email Address"
        placeholderTextColor={colors.muted}
        testID="auth-entry-email"
        value={email}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.muted,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          fontSize: typography.fontSize.md,
          color: colors.text,
          marginBottom: spacing.sm,
        }}
      />

      {/* Password input */}
      <TextInput
        accessibilityLabel="Password"
        editable={!isSigningIn}
        secureTextEntry
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        testID="auth-entry-password"
        value={password}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.muted,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          fontSize: typography.fontSize.md,
          color: colors.text,
          marginBottom: spacing.lg,
        }}
      />

      {/* Sign In CTA */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={isSigningIn ? 'Signing in' : 'Sign in'}
        accessibilityState={{ disabled: isSignInDisabled, busy: isSigningIn }}
        disabled={isSignInDisabled}
        onPress={handleSignIn}
        testID="auth-entry-sign-in"
        activeOpacity={0.85}
        style={{
          backgroundColor: isSignInDisabled ? colors.muted : colors.primary,
          borderRadius: radius.pill,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
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
          {isSigningIn ? 'Signing In…' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      {/* Create account link */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Create an account"
          accessibilityState={{ disabled: isCreateAccountDisabled }}
          disabled={isCreateAccountDisabled}
          onPress={handleCreateAccount}
          testID="auth-entry-create-account"
        >
          <Text style={{ color: colors.muted, fontSize: typography.fontSize.sm }}>
            New to QuickWerk?{' '}
            <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.semibold }}>
              Create an account
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trust badges */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: spacing.sm,
        }}
      >
        <TrustBadge label="Verified Pros" />
        <TrustBadge label="Secure Payments" />
        <TrustBadge label="24/7 Support" />
      </View>
    </ScrollView>
  );
}

export default AuthEntryScreen;
