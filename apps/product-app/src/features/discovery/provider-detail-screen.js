import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { loadProviderDetail } from './provider-detail-actions';
import { productAppShell } from '../../shared/app-shell';
import { ProductScreenShell } from '../../shared/product-screen-shell';

/**
 * Provider detail screen (customer-facing).
 *
 * Route: /provider-detail?providerUserId=<id>
 *
 * Loads the provider summary by ID from the public discovery list.
 * Renders loading / not-found / error / loaded states.
 */
export function ProviderDetailScreen() {
  const router = useRouter();
  const { providerUserId } = useLocalSearchParams();

  const [provider, setProvider] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [notFound, setNotFound] = useState(false);

  function fetchDetail(id) {
    const normalizedId = typeof id === 'string' ? id.trim() : '';

    if (!normalizedId) {
      setErrorMessage('Missing provider id');
      setNotFound(true);
      setProvider(undefined);
      return;
    }

    if (isLoading) return;

    setErrorMessage(undefined);
    setNotFound(false);
    setIsLoading(true);

    loadProviderDetail(normalizedId)
      .then((result) => {
        if (result.notFound) {
          setNotFound(true);
          return;
        }
        if (result.errorMessage) {
          setErrorMessage(result.errorMessage);
          return;
        }
        setProvider(result.provider);
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unexpected error loading provider.',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  // Load on mount whenever providerUserId is available
  useEffect(() => {
    const normalizedParam = Array.isArray(providerUserId) ? providerUserId[0] : providerUserId;

    if (!normalizedParam || typeof normalizedParam !== 'string') {
      setErrorMessage('Missing provider id');
      setNotFound(true);
      setProvider(undefined);
      return;
    }

    fetchDetail(normalizedParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerUserId]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/discovery');
    }
  };

  return (
    <ProductScreenShell
      title="Provider Profile"
      testID="provider-detail-screen"
    >
      {/* Back navigation */}
      <Pressable
        accessibilityLabel="Back to discovery"
        accessibilityRole="button"
        onPress={handleBack}
        testID="provider-detail-back"
        style={{ marginBottom: 16 }}
      >
        <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '600', fontSize: 14 }}>
          ← Back
        </Text>
      </Pressable>

      {isLoading ? (
        <View
          testID="provider-detail-loading"
          style={{ alignItems: 'center', paddingVertical: 32 }}
        >
          <ActivityIndicator size="small" color={productAppShell.theme.color.primary} />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 14 }}>
            Loading provider…
          </Text>
        </View>
      ) : notFound ? (
        <View
          testID="provider-detail-not-found"
          style={{ alignItems: 'center', paddingVertical: 32 }}
        >
          <Text style={{ color: '#94A3B8', fontSize: 15 }}>Provider not found.</Text>
          <Pressable
            accessibilityLabel="Back to discovery"
            accessibilityRole="button"
            onPress={handleBack}
            testID="provider-detail-not-found-back"
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '600' }}>
              Back to discovery
            </Text>
          </Pressable>
        </View>
      ) : errorMessage ? (
        <View
          testID="provider-detail-error"
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: '#FEF2F2',
            borderWidth: 1,
            borderColor: '#FECACA',
          }}
        >
          <Text style={{ color: '#DC2626', fontSize: 14 }}>{errorMessage}</Text>
          <Pressable
            accessibilityLabel="Retry loading provider"
            accessibilityRole="button"
            onPress={() => fetchDetail(Array.isArray(providerUserId) ? providerUserId[0] : providerUserId)}
            testID="provider-detail-retry"
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : provider ? (
        <View testID="provider-detail-content">
          {/* Display name */}
          <Text
            testID="provider-detail-name"
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#0F172A',
              marginBottom: 4,
            }}
          >
            {provider.displayName}
          </Text>

          {/* Trade categories */}
          {provider.tradeCategories.length > 0 ? (
            <View
              testID="provider-detail-categories"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 8,
              }}
            >
              {provider.tradeCategories.map((cat) => (
                <View
                  key={cat}
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                >
                  <Text style={{ color: '#1D4ED8', fontSize: 13, fontWeight: '500' }}>
                    {cat}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Service area */}
          {provider.serviceArea ? (
            <Text
              testID="provider-detail-area"
              style={{ color: '#64748B', fontSize: 14, marginBottom: 8 }}
            >
              📍 {provider.serviceArea}
            </Text>
          ) : null}

          {/* Bio */}
          {provider.bio ? (
            <View
              testID="provider-detail-bio"
              style={{
                marginTop: 8,
                padding: 14,
                borderRadius: 10,
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Text style={{ color: '#334155', fontSize: 14, lineHeight: 20 }}>
                {provider.bio}
              </Text>
            </View>
          ) : null}

          {/* Book this provider CTA */}
          <Pressable
            accessibilityLabel={`Book ${provider.displayName}`}
            accessibilityRole="button"
            testID="provider-detail-book-cta"
            onPress={() =>
              router.push({
                pathname: '/booking-wizard',
                params: {
                  providerUserId: provider.providerUserId,
                  providerName: provider.displayName,
                  category: provider.tradeCategories[0] ?? '',
                },
              })
            }
            style={{
              marginTop: 24,
              backgroundColor: productAppShell.theme.color.primary,
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
              Book {provider.displayName}
            </Text>
          </Pressable>

          {/* Provider ID (small, for QA purposes) */}
          <Text
            testID="provider-detail-id"
            style={{ color: '#CBD5E1', fontSize: 11, marginTop: 16 }}
          >
            ID: {provider.providerUserId}
          </Text>
        </View>
      ) : null}
    </ProductScreenShell>
  );
}
