import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loadPublicProviders } from './provider-discovery-actions';
import { productAppShell } from '../../shared/app-shell';
import { ProductScreenShell } from '../../shared/product-screen-shell';

const FILTER_DEBOUNCE_MS = 400;

/**
 * Customer-facing provider discovery screen.
 * Renders loading / empty / error / loaded states.
 * Includes a trade-category filter input wired to the discovery fetch.
 * Tapping a provider row navigates to the provider detail screen.
 */
export function DiscoveryScreen({ initialTradeCategory = '', initialLocation = '' }) {
  const router = useRouter();

  const [providers, setProviders] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [tradeCategoryInput, setTradeCategoryInput] = useState(initialTradeCategory);
  const [locationInput, setLocationInput] = useState(initialLocation);

  // Debounce timer ref so rapid typing only fires one fetch
  const debounceRef = useRef(undefined);
  const requestIdRef = useRef(0);

  /**
   * Fetches providers with bounded trade category + location filtering.
   */
  function fetchProviders(filter) {
    const tradeCategory = filter?.tradeCategory?.trim() || undefined;
    const location = filter?.location?.trim() || undefined;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setErrorMessage(undefined);
    setIsLoading(true);

    loadPublicProviders(tradeCategory || location ? { tradeCategory, location } : undefined)
      .then((result) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (result.errorMessage) {
          setErrorMessage(result.errorMessage);
          return;
        }
        setProviders(result.providers);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setErrorMessage(
          err instanceof Error ? err.message : 'Unexpected error loading providers.',
        );
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
  }

  // Initial load on mount with route-level default filters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchProviders({
      tradeCategory: initialTradeCategory,
      location: initialLocation,
    });
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
  }, []);

  const scheduleDebouncedFetch = (nextFilter) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchProviders(nextFilter);
    }, FILTER_DEBOUNCE_MS);
  };

  const handleTradeCategoryChange = (value) => {
    setTradeCategoryInput(value);
    scheduleDebouncedFetch({ tradeCategory: value, location: locationInput });
  };

  const handleLocationChange = (value) => {
    setLocationInput(value);
    scheduleDebouncedFetch({ tradeCategory: tradeCategoryInput, location: value });
  };

  const handleRetry = () => {
    fetchProviders({ tradeCategory: tradeCategoryInput, location: locationInput });
  };

  const handleProviderPress = (provider) => {
    router.push({
      pathname: '/provider-detail',
      params: { providerUserId: provider.providerUserId },
    });
  };

  return (
    <ProductScreenShell
      title="Find a Provider"
      subtitle="Browse verified trade professionals in your area."
      testID="discovery-screen"
    >
      {/* Discovery filters */}
      <View
        testID="discovery-filter-container"
        style={{ marginBottom: 16 }}
      >
        <TextInput
          accessibilityLabel="Filter by trade category"
          onChangeText={handleTradeCategoryChange}
          placeholder="Filter by trade category (e.g. plumbing)"
          placeholderTextColor="#94A3B8"
          testID="discovery-filter-input-trade-category"
          value={tradeCategoryInput}
          style={{
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 15,
            color: '#0F172A',
            backgroundColor: '#F8FAFC',
          }}
        />
        <TextInput
          accessibilityLabel="Filter by service location"
          onChangeText={handleLocationChange}
          placeholder="Filter by location (e.g. Vienna)"
          placeholderTextColor="#94A3B8"
          testID="discovery-filter-input-location"
          value={locationInput}
          style={{
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 15,
            color: '#0F172A',
            backgroundColor: '#F8FAFC',
            marginTop: 10,
          }}
        />
      </View>

      {/* States: loading / error / empty / loaded */}
      {isLoading ? (
        <View
          testID="discovery-loading"
          style={{ alignItems: 'center', paddingVertical: 32 }}
        >
          <ActivityIndicator size="small" color={productAppShell.theme.color.primary} />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 14 }}>
            Loading providers…
          </Text>
        </View>
      ) : errorMessage ? (
        <View
          testID="discovery-error"
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
            accessibilityLabel="Retry loading providers"
            accessibilityRole="button"
            onPress={handleRetry}
            testID="discovery-retry"
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : providers && providers.length === 0 ? (
        <View
          testID="discovery-empty"
          style={{ alignItems: 'center', paddingVertical: 32 }}
        >
          <Text style={{ color: '#94A3B8', fontSize: 15 }}>
            {tradeCategoryInput.trim() || locationInput.trim()
              ? `No providers found for "${tradeCategoryInput.trim() || 'any trade'}" in "${locationInput.trim() || 'any location'}".`
              : 'No providers available right now.'}
          </Text>
          {tradeCategoryInput.trim() || locationInput.trim() ? (
            <Pressable
              accessibilityLabel="Clear filter"
              accessibilityRole="button"
              onPress={() => {
                setTradeCategoryInput('');
                setLocationInput('');
                fetchProviders({ tradeCategory: '', location: '' });
              }}
              testID="discovery-clear-filter"
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '600' }}>
                Clear filter
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : providers ? (
        <ScrollView testID="discovery-list">
          {providers.map((provider) => (
            <Pressable
              key={provider.providerUserId}
              accessibilityLabel={`View profile of ${provider.displayName}`}
              accessibilityRole="button"
              onPress={() => handleProviderPress(provider)}
              testID={`discovery-provider-row-${provider.providerUserId}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                marginBottom: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#D7DFEA',
                backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF',
              })}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  testID={`discovery-provider-name-${provider.providerUserId}`}
                  style={{ color: '#0F172A', fontWeight: '700', fontSize: 15 }}
                  numberOfLines={1}
                >
                  {provider.displayName}
                </Text>

                {provider.tradeCategories.length > 0 ? (
                  <Text
                    testID={`discovery-provider-categories-${provider.providerUserId}`}
                    style={{ color: '#475569', fontSize: 13, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {provider.tradeCategories.join(', ')}
                  </Text>
                ) : null}

                {provider.serviceArea ? (
                  <Text
                    testID={`discovery-provider-area-${provider.providerUserId}`}
                    style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {provider.serviceArea}
                  </Text>
                ) : null}

                {provider.bio ? (
                  <Text
                    testID={`discovery-provider-bio-${provider.providerUserId}`}
                    style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}
                    numberOfLines={2}
                  >
                    {provider.bio}
                  </Text>
                ) : null}
              </View>

              <Text
                style={{
                  color: productAppShell.theme.color.primary,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                View →
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </ProductScreenShell>
  );
}
