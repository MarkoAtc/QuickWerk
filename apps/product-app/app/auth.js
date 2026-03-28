import { useState } from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { AuthEntryScreen } from '../src/features/auth/auth-entry-screen';
import { signInWithCredentials } from '../src/features/auth/auth-entry-actions';
import { useSession } from '../src/shared/session-provider';

export default function ProductAuthScreen() {
  const router = useRouter();
  const { setSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async ({ email, password, role }) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = await signInWithCredentials({ email, password, role });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSession({
      status: 'authenticated',
      sessionToken: result.sessionToken,
      role: result.role,
    });

    if (result.role === 'provider') {
      router.replace('/provider');
    } else {
      router.replace('/home-triage');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthEntryScreen onSignIn={handleSignIn} isSigningIn={loading} />
      {error ? (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 16,
            right: 16,
            backgroundColor: '#FEE2E2',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <Text style={{ color: '#B91C1C', textAlign: 'center', fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
