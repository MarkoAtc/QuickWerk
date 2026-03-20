import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { createSignInFormState } from './sign-in-screen-actions';
import { createAuthenticatedSession, sessionStore } from '../../shared/session-context';
import { productAppShell } from '../../shared/app-shell';
import { ProductScreenShell } from '../../shared/product-screen-shell';

const roles = ['customer', 'provider'];

export function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);

  const handleSignIn = () => {
    if (isSubmitting || !email.trim()) {
      return;
    }

    setErrorMessage(undefined);
    setIsSubmitting(true);

    createSignInFormState({ email: email.trim(), role })
      .then((result) => {
        if (result.errorMessage) {
          setErrorMessage(result.errorMessage);
          return;
        }

        sessionStore.set(createAuthenticatedSession(result.sessionToken, role));

        if (role === 'provider') {
          router.replace('/provider');
        } else {
          router.replace('/booking');
        }
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Unexpected sign-in failure.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <ProductScreenShell
      title="Sign in to QuickWerk"
      subtitle="Enter your email and select your role to continue."
      testID="sign-in-screen"
    >
      <View
        testID="sign-in-form"
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#D7DFEA',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 6 }}>Email</Text>
        <TextInput
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="your@email.com"
          testID="sign-in-email-input"
          value={email}
          style={{
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 8,
            padding: 10,
            fontSize: 16,
            color: '#0F172A',
            backgroundColor: '#F8FAFC',
          }}
        />

        <Text style={{ color: '#334155', fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Role</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {roles.map((r) => {
            const selected = role === r;
            return (
              <Pressable
                key={r}
                accessibilityLabel={r === 'customer' ? 'Customer role' : 'Provider role'}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setRole(r)}
                testID={`sign-in-role-${r}`}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  alignItems: 'center',
                  borderColor: selected ? productAppShell.theme.color.primary : '#CBD5E1',
                  backgroundColor: selected ? productAppShell.theme.color.primary : '#FFFFFF',
                }}
              >
                <Text
                  style={{
                    color: selected ? '#FFFFFF' : '#334155',
                    fontWeight: selected ? '700' : '500',
                    textTransform: 'capitalize',
                  }}
                >
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {errorMessage ? (
          <Text testID="sign-in-error" style={{ marginTop: 12, color: '#DC2626', fontSize: 14 }}>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityLabel="Sign in"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting || !email.trim() }}
          disabled={isSubmitting || !email.trim()}
          onPress={handleSignIn}
          testID="sign-in-submit"
          style={{
            marginTop: 16,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor:
              isSubmitting || !email.trim()
                ? '#94A3B8'
                : productAppShell.theme.color.primary,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>
      </View>
    </ProductScreenShell>
  );
}
