import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, componentStyles, radius, shadow, spacing, typography } from '@quickwerk/ui';

const SERVICE_CATEGORIES = [
  {
    id: 'plumbing',
    label: 'Plumbing',
    description: 'Leaks, drains, hot water, emergency repairs',
    icon: '🔧',
    prosNearby: 4,
    accent: colors.secondaryBright,
    testID: 'service-card-plumbing',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    description: 'Power issues, sockets, lighting, urgent fixes',
    icon: '⚡',
    prosNearby: 2,
    accent: colors.cta,
    testID: 'service-card-electrical',
  },
  {
    id: 'heating',
    label: 'Heating',
    description: 'Boilers, radiators, pressure, maintenance',
    icon: '🔥',
    prosNearby: 3,
    accent: colors.warning,
    testID: 'service-card-heating',
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    description: 'Move-out cleans, offices, recurring support',
    icon: '✨',
    prosNearby: 6,
    accent: colors.secondaryBright,
    testID: 'service-card-cleaning',
  },
];

const TRUST_HIGHLIGHTS = [
  { label: 'Verified providers', value: '120+' },
  { label: 'Average response', value: '< 12 min' },
  { label: 'Bookings completed', value: '2,400+' },
];

const CURATED_MATCHES = [
  {
    id: 'ak-sanitary',
    name: 'AK Sanitary Services',
    specialty: 'Emergency plumbing • Vienna',
    rating: '4.9',
    eta: '3 min response',
  },
  {
    id: 'voltworks',
    name: 'VoltWorks Electrical',
    specialty: 'Electrical repair • 1010-1090',
    rating: '4.8',
    eta: '12 min response',
  },
  {
    id: 'cleanflow',
    name: 'CleanFlow Facility Care',
    specialty: 'Office cleaning • Same-day slots',
    rating: '4.7',
    eta: 'Today available',
  },
];

function AddressPill({ address, onPress }) {
  return (
    <Pressable
      accessibilityLabel={`Current location: ${address}. Tap to change.`}
      accessibilityRole="button"
      onPress={onPress}
      style={{ alignSelf: 'flex-start' }}
      testID="home-triage-address-pill"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <Text style={{ color: colors.secondaryBright, fontSize: 14 }}>📍</Text>
        <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>{address}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>›</Text>
      </View>
    </Pressable>
  );
}

function TrustMetric({ label, value }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 24,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.card,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </Text>
      <Text style={{ marginTop: spacing.sm, color: colors.text, fontSize: 30, lineHeight: 34, fontWeight: typography.fontWeight.bold, letterSpacing: -0.4 }}>
        {value}
      </Text>
    </View>
  );
}

function ServiceCard({ category, onPress }) {
  return (
    <Pressable
      accessibilityLabel={`${category.label}. ${category.prosNearby} providers nearby.`}
      accessibilityRole="button"
      onPress={() => onPress(category.id)}
      style={{ width: '48.8%' }}
      testID={category.testID}
    >
      <View
        style={{
          minHeight: 260,
          borderRadius: 32,
          padding: spacing.xl,
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: `${category.accent}14`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>{category.icon}</Text>
          </View>

          <View
            style={{
              borderRadius: radius.pill,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.surfaceContainer,
            }}
          >
            <Text style={{ color: category.accent, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              {category.prosNearby} nearby
            </Text>
          </View>
        </View>

        <View>
          <Text style={{ color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: typography.fontWeight.bold, letterSpacing: -0.5 }}>
            {category.label}
          </Text>
          <Text style={{ marginTop: spacing.md, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
            {category.description}
          </Text>
          <Text style={{ marginTop: spacing.lg, color: colors.primary, fontSize: typography.fontSize.bodyMd, fontWeight: typography.fontWeight.bold }}>
            Explore category →
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function MatchCard({ match, onBrowseProviders }) {
  return (
    <Pressable accessibilityRole="button" onPress={onBrowseProviders} style={{ width: 320 }}>
      <View
        style={{
          borderRadius: 28,
          padding: spacing.lg,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold }}>
              {match.name}
            </Text>
            <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
              {match.specialty}
            </Text>
          </View>
          <Text style={{ color: '#8A6500', fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>★ {match.rating}</Text>
        </View>
        <Text style={{ marginTop: spacing.lg, color: colors.secondaryBright, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.bold }}>
          {match.eta}
        </Text>
      </View>
    </Pressable>
  );
}

function LiveMapPreview() {
  const providers = [
    { initials: 'AK', eta: '3 min', top: 48, left: 44 },
    { initials: 'JS', eta: '5 min', top: 88, right: 48 },
    { initials: 'MP', eta: '8 min', bottom: 36, left: 120 },
  ];

  return (
    <View
      style={{
        marginTop: spacing.xl,
        borderRadius: 36,
        overflow: 'hidden',
        backgroundColor: '#EAF1F8',
        borderWidth: 1,
        borderColor: '#DCE4EE',
        minHeight: 440,
        ...shadow.card,
      }}
    >
      <View style={{ position: 'absolute', inset: 0, backgroundColor: '#EEF3F8' }} />

      <View
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderWidth: 1,
            borderColor: 'rgba(199,198,204,0.4)',
          }}
        >
          <Text style={{ color: colors.text, fontSize: typography.fontSize.bodySm, fontWeight: typography.fontWeight.semibold }}>
            Live provider map
          </Text>
        </View>

        <View
          style={{
            backgroundColor: 'rgba(255,138,0,0.12)',
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Text style={{ color: colors.cta, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
            3 nearby now
          </Text>
        </View>
      </View>

      {providers.map((provider) => (
        <View
          key={provider.initials}
          style={{
            position: 'absolute',
            top: provider.top,
            left: provider.left,
            right: provider.right,
            bottom: provider.bottom,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.full,
              backgroundColor: colors.primaryContainer,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              ...shadow.card,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.labelMd }}>
              {provider.initials}
            </Text>
          </View>
          <View
            style={{
              marginTop: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: '#FFFFFF',
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <Text style={{ color: colors.text, fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.semibold }}>
              {provider.eta}
            </Text>
          </View>
        </View>
      ))}

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 24,
          borderRadius: 32,
          padding: spacing.xl,
          backgroundColor: 'rgba(255,255,255,0.94)',
          borderWidth: 1,
          borderColor: 'rgba(199,198,204,0.28)',
          ...shadow.elevated,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 40, lineHeight: 44, fontWeight: typography.fontWeight.bold, letterSpacing: -0.7, maxWidth: 620 }}>
          Fast local help, without the old marketplace clutter.
        </Text>
        <Text style={{ marginTop: spacing.md, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd, maxWidth: 560 }}>
          Browse verified trades, compare availability, and continue straight into booking with a calmer, more premium flow.
        </Text>
      </View>
    </View>
  );
}

export function HomeTriage({ address = '1010 Vienna, AT', onSelectCategory, onChangeAddress, onBrowseProviders }) {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.container,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="home-triage-screen"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <AddressPill address={address} onPress={onChangeAddress} />

        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.full,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.card,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18 }}>👤</Text>
        </View>
      </View>

      <View style={{ marginBottom: spacing.lg, maxWidth: 920 }}>
        <Text style={{ color: colors.text, fontSize: 64, lineHeight: 68, fontWeight: typography.fontWeight.bold, letterSpacing: -1.4, maxWidth: 880 }}>
          Find the right pro, without the marketplace noise.
        </Text>
        <Text style={{ marginTop: spacing.lg, color: colors.textSoft, fontSize: typography.fontSize.bodyLg, lineHeight: typography.lineHeight.bodyLg, maxWidth: 700 }}>
          Choose a service category, compare trusted professionals, and move through booking in a flow that actually feels complete.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
        {TRUST_HIGHLIGHTS.map((item) => (
          <TrustMetric key={item.label} label={item.label} value={item.value} />
        ))}
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
          Popular service categories
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
          Start with the most common demand types customers ask for on the platform.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.lg, marginTop: spacing.xl }}>
        {SERVICE_CATEGORIES.map((category) => (
          <ServiceCard key={category.id} category={category} onPress={onSelectCategory ?? (() => {})} />
        ))}
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <Text style={{ color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold }}>
          Curated nearby matches
        </Text>
        <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
          Give the customer immediate confidence that real providers exist before they drill deeper.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.sm }}>
        {CURATED_MATCHES.map((match) => (
          <MatchCard key={match.id} match={match} onBrowseProviders={onBrowseProviders ?? (() => {})} />
        ))}
      </ScrollView>

      <LiveMapPreview />

      {onBrowseProviders ? (
        <Pressable accessibilityLabel="Browse all providers" accessibilityRole="button" onPress={onBrowseProviders} testID="home-triage-browse-providers">
          <View
            style={{
              ...componentStyles.button.dark,
              marginTop: spacing.xl,
              flexDirection: 'row',
              gap: spacing.sm,
              minHeight: 68,
              borderRadius: 24,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>
              Browse all providers
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 16 }}>→</Text>
          </View>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

export default HomeTriage;
