import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { loadProviderDetail } from '../src/features/discovery/provider-detail-actions';
import { ProviderProfile } from '../src/features/marketplace/provider-profile-screen';
import { productAppShell } from '../src/shared/app-shell';

export default function ProviderProfileRoute() {
  const router = useRouter();
  const { providerUserId } = useLocalSearchParams();
  const [provider, setProvider] = useState(undefined);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedProviderUserId = Array.isArray(providerUserId) ? providerUserId[0] : providerUserId;

  useEffect(() => {
    if (!normalizedProviderUserId || typeof normalizedProviderUserId !== 'string') {
      setErrorMessage('Missing provider id. Open this route from discovery.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    setProvider(undefined);

    loadProviderDetail(normalizedProviderUserId)
      .then((result) => {
        if (result.notFound) {
          setErrorMessage('Provider not found.');
          return;
        }

        if (result.errorMessage) {
          setErrorMessage(result.errorMessage);
          return;
        }

        setProvider({
          name: result.provider.displayName,
          title:
            result.provider.tradeCategories.length > 0
              ? result.provider.tradeCategories.join(' / ')
              : 'Verified provider',
          bio: result.provider.bio,
        });
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Unexpected error loading provider.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [normalizedProviderUserId]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <ActivityIndicator size="small" color={productAppShell.theme.color.primary} />
        <Text style={{ color: '#64748B' }}>Loading provider profile…</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#B91C1C', textAlign: 'center' }}>{errorMessage}</Text>
        <Pressable
          accessibilityLabel="Back to discovery"
          accessibilityRole="button"
          onPress={() => router.replace('/discovery')}
          style={{ marginTop: 10 }}
        >
          <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '600' }}>Back to discovery</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ProviderProfile
      provider={provider}
      onClose={() => router.replace('/discovery')}
      onRequest={() =>
        router.push({
          pathname: '/booking-wizard',
          params: {
            providerUserId: normalizedProviderUserId,
            providerName: provider?.name,
          },
        })
      }
    />
  );
}
