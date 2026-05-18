import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

import { loadPublicProviders } from './provider-discovery-actions';

const FILTER_DEBOUNCE_MS = 400;

const FALLBACK_PROVIDERS = [
  {
    providerUserId: 'showcase-plumbstar',
    displayName: 'PlumbStar Vienna',
    tradeCategories: ['Plumbing', 'Emergency repair'],
    serviceArea: 'Vienna • 1010-1190',
    bio: 'Fast-response plumbing team focused on emergency repairs, diagnostics, and clean communication.',
    averageRating: '4.9',
    tags: ['Available today', 'Verified', 'Same-day quotes'],
  },
  {
    providerUserId: 'showcase-voltworks',
    displayName: 'VoltWorks Electrical',
    tradeCategories: ['Electrical', 'Fault finding'],
    serviceArea: 'Vienna • 1020-1180',
    bio: 'Premium electrical support for urgent outages, lighting issues, and scheduled troubleshooting.',
    averageRating: '4.8',
    tags: ['Trusted by offices', 'Urgent support', 'Insured'],
  },
  {
    providerUserId: 'showcase-heatline',
    displayName: 'HeatLine Systems',
    tradeCategories: ['Heating', 'Boilers'],
    serviceArea: 'Vienna & Lower Austria',
    bio: 'Boiler maintenance, radiator repairs, and heating diagnostics with strong service quality signals.',
    averageRating: '4.7',
    tags: ['Maintenance plans', 'Commercial ready', 'Certified'],
  },
  {
    providerUserId: 'showcase-cleanflow',
    displayName: 'CleanFlow Facility Care',
    tradeCategories: ['Cleaning', 'Facility services'],
    serviceArea: 'Central Vienna',
    bio: 'Recurring office cleaning, move-out support, and reliable scheduling for business clients.',
    averageRating: '4.8',
    tags: ['Recurring plans', 'Office specialist', 'Fast onboarding'],
  },
];

function FilterField({ value, onChangeText, placeholder, testID }) {
  return (
    <TextInput
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={componentStyles.input.base}
      testID={testID}
      value={value}
    />
  );
}

function HeroStat({ label, value, accent = colors.secondaryBright }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 24,
        padding: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <Text style={{ color: colors.onPrimaryContainer, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </Text>
      <Text style={{ marginTop: spacing.sm, color: accent, fontSize: 34, lineHeight: 38, fontWeight: typography.fontWeight.bold, letterSpacing: -0.4 }}>
        {value}
      </Text>
    </View>
  );
}

function Tag({ label }) {
  return (
    <View
      style={{
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceContainer,
      }}
    >
      <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold }}>{label}</Text>
    </View>
  );
}

function ProviderCard({ provider, onPress }) {
  return (
    <Pressable accessibilityLabel={`View profile of ${provider.displayName}`} accessibilityRole="button" onPress={() => onPress(provider)} testID={`discovery-provider-row-${provider.providerUserId}`}>
      <View
        style={{
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          marginBottom: spacing.lg,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: `${colors.secondaryBright}14`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.secondaryBright, fontSize: 26, fontWeight: typography.fontWeight.bold }}>
              {provider.displayName
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('') || 'PR'}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 30, lineHeight: 34, fontWeight: typography.fontWeight.bold, letterSpacing: -0.4 }} testID={`discovery-provider-name-${provider.providerUserId}`}>
                  {provider.displayName}
                </Text>
                <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }} testID={`discovery-provider-categories-${provider.providerUserId}`}>
                  {provider.tradeCategories.join(' • ')}
                </Text>
              </View>

              <View
                style={{
                  borderRadius: radius.pill,
                  backgroundColor: 'rgba(255, 214, 0, 0.18)',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text style={{ color: '#8A6500', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
                  ★ {provider.averageRating ?? '4.9'}
                </Text>
              </View>
            </View>

            <Text style={{ marginTop: spacing.md, color: colors.textMuted, fontSize: typography.fontSize.bodySm }} testID={`discovery-provider-area-${provider.providerUserId}`}>
              {provider.serviceArea || 'Service area not specified'}
            </Text>
          </View>
        </View>

        {provider.bio ? (
          <Text numberOfLines={2} style={{ marginTop: spacing.lg, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }} testID={`discovery-provider-bio-${provider.providerUserId}`}>
            {provider.bio}
          </Text>
        ) : null}

        {provider.tags?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
            {provider.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>Detailed profile, reviews, and booking flow</Text>
          <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}>View provider →</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyDiscoveryState({ tradeCategoryInput, locationInput, onClear }) {
  return (
    <View
      style={{
        borderRadius: 32,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.card,
      }}
      testID="discovery-empty"
    >
      <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
        No live providers matched your current filters.
      </Text>
      <Text style={{ marginTop: spacing.md, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd, maxWidth: 760 }}>
        {tradeCategoryInput.trim() || locationInput.trim()
          ? `Nothing matched ${tradeCategoryInput.trim() || 'all trades'} in ${locationInput.trim() || 'all locations'} right now. For the showcase, we still keep the marketplace feeling rich by surfacing curated providers below.`
          : 'There are currently no live providers returned from the API. The showcase view still surfaces curated demo provider cards so the app does not feel empty.'}
      </Text>

      <Pressable accessibilityRole="button" onPress={onClear} testID="discovery-clear-filter">
        <View style={{ ...componentStyles.button.ghost, marginTop: spacing.lg, alignSelf: 'flex-start' }}>
          <Text style={{ color: colors.text, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>Clear filters</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function DiscoveryScreen({ initialTradeCategory = '', initialLocation = '' }) {
  const router = useRouter();

  const [providers, setProviders] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [tradeCategoryInput, setTradeCategoryInput] = useState(initialTradeCategory);
  const [locationInput, setLocationInput] = useState(initialLocation);

  const debounceRef = useRef(undefined);
  const requestIdRef = useRef(0);

  function fetchProviders(filter) {
    const tradeCategory = filter?.tradeCategory?.trim() || undefined;
    const location = filter?.location?.trim() || undefined;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setErrorMessage(undefined);
    setIsLoading(true);

    loadPublicProviders(tradeCategory || location ? { tradeCategory, location } : undefined)
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        if (result.errorMessage) {
          setErrorMessage(result.errorMessage);
          return;
        }
        setProviders(result.providers);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setErrorMessage(err instanceof Error ? err.message : 'Unexpected error loading providers.');
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
  }

  useEffect(() => {
    fetchProviders({ tradeCategory: initialTradeCategory, location: initialLocation });
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
  }, []);

  const scheduleDebouncedFetch = (nextFilter) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
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

  const fallbackProviders = FALLBACK_PROVIDERS.filter((provider) => {
    const tradeCategory = tradeCategoryInput.trim().toLowerCase();
    const location = locationInput.trim().toLowerCase();

    const matchesTrade = !tradeCategory || provider.tradeCategories.join(' ').toLowerCase().includes(tradeCategory);
    const matchesLocation = !location || (provider.serviceArea || '').toLowerCase().includes(location);

    return matchesTrade && matchesLocation;
  });

  const liveVisibleCount = providers ? providers.length : 0;
  const showcaseVisibleCount = liveVisibleCount > 0 ? liveVisibleCount : fallbackProviders.length;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="discovery-screen"
    >
      <View
        style={{
          borderRadius: 36,
          padding: spacing.xl,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 54, lineHeight: 58, fontWeight: typography.fontWeight.bold, letterSpacing: -1, maxWidth: 920 }}>
          Browse verified providers with real signal, not clutter.
        </Text>
        <Text style={{ marginTop: spacing.md, color: colors.onPrimaryContainer, fontSize: typography.fontSize.bodyLg, lineHeight: typography.lineHeight.bodyLg, maxWidth: 760 }}>
          Filter by trade and location, compare the strongest local options, and move into booking without the marketplace feeling thin or unfinished.
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          <HeroStat label="Status" value={isLoading ? 'Loading' : 'Live'} accent={isLoading ? colors.cta : colors.success} />
          <HeroStat label="Visible" value={String(showcaseVisibleCount)} />
          <HeroStat label="Featured" value="4 curated" accent={colors.warning} />
        </View>
      </View>

      <View
        style={{
          marginTop: spacing.xl,
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
        testID="discovery-filter-container"
      >
        <Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: typography.fontWeight.bold }}>
          Refine the shortlist
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
          Keep the search feeling premium even before real matching logic is fully deepened.
        </Text>

        <View style={{ marginTop: spacing.xl }}>
          <FilterField onChangeText={handleTradeCategoryChange} placeholder="Filter by trade category, e.g. plumbing" testID="discovery-filter-input-trade-category" value={tradeCategoryInput} />
          <View style={{ height: spacing.md }} />
          <FilterField onChangeText={handleLocationChange} placeholder="Filter by location, e.g. Vienna" testID="discovery-filter-input-location" value={locationInput} />
        </View>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
          Marketplace results
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
          A strong browsing experience needs both live results and enough richness to make the product feel complete in demos.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }} testID="discovery-loading">
            <ActivityIndicator color={colors.secondaryBright} size="small" />
            <Text style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>Loading providers…</Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View
            style={{
              borderRadius: 28,
              padding: spacing.lg,
              backgroundColor: colors.errorContainer,
              borderWidth: 1,
              borderColor: '#FECACA',
              marginBottom: spacing.lg,
            }}
            testID="discovery-error"
          >
            <Text style={{ color: colors.onErrorContainer, fontSize: typography.fontSize.bodySm }}>{errorMessage}</Text>
            <Pressable accessibilityLabel="Retry loading providers" accessibilityRole="button" onPress={handleRetry} testID="discovery-retry">
              <Text style={{ marginTop: spacing.sm, color: colors.onErrorContainer, fontWeight: typography.fontWeight.bold }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {providers && providers.length > 0 ? providers.map((provider) => <ProviderCard key={provider.providerUserId} onPress={handleProviderPress} provider={provider} />) : null}

        {!isLoading && (!providers || providers.length === 0) ? (
          <EmptyDiscoveryState
            tradeCategoryInput={tradeCategoryInput}
            locationInput={locationInput}
            onClear={() => {
              setTradeCategoryInput('');
              setLocationInput('');
              fetchProviders({ tradeCategory: '', location: '' });
            }}
          />
        ) : null}
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
          Curated provider showcase
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
          Even if live data is sparse, the product should still demonstrate what a strong provider marketplace looks like.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        {fallbackProviders.map((provider) => (
          <ProviderCard key={provider.providerUserId} onPress={handleProviderPress} provider={provider} />
        ))}
      </View>
    </ScrollView>
  );
}

export default DiscoveryScreen;
