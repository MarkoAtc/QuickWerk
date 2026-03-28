import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

const SERVICE_CATEGORIES = [
  {
    id: 'plumbing',
    label: 'Plumbing',
    icon: '🔧',
    iconBackground: '#E8F5EE',
    prosNearby: 4,
    testID: 'service-card-plumbing',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    icon: '⚡',
    iconBackground: '#FFF8E6',
    prosNearby: 2,
    testID: 'service-card-electrical',
  },
];

function AddressPill({ address, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Current location: ${address}. Tap to change.`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.muted,
        gap: spacing.sm,
        ...shadow.soft,
      }}
    >
      <Text style={{ fontSize: 14 }}>📍</Text>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
        }}
      >
        {address}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>›</Text>
    </TouchableOpacity>
  );
}

function ServiceCard({ category, onPress }) {
  return (
    <TouchableOpacity
      onPress={() => onPress(category.id)}
      accessibilityRole="button"
      accessibilityLabel={`${category.label}. ${category.prosNearby} pros nearby.`}
      testID={category.testID}
      activeOpacity={0.9}
      style={{
        flex: 1,
        height: 160,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: spacing.lg,
        justifyContent: 'space-between',
        ...shadow.soft,
      }}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.pill,
          backgroundColor: category.iconBackground,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 24 }}>{category.icon}</Text>
      </View>

      <View>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          {category.label}
        </Text>

        {/* Pros nearby badge */}
        <View
          style={{
            marginTop: spacing.xs,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
            }}
          />
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            {category.prosNearby} pros nearby
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MapPeek() {
  return (
    <View
      style={{
        marginTop: spacing.xl,
        borderRadius: radius.card,
        backgroundColor: '#EDF2F0',
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#D5E4DC',
      }}
    >
      {/* Provider avatar pins (placeholder) */}
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md }}>
        {[
          { initials: 'AK', eta: '3 min' },
          { initials: 'JS', eta: '5 min' },
          { initials: 'MP', eta: '8 min' },
        ].map((provider) => (
          <View key={provider.initials} style={{ alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.surface,
                ...shadow.soft,
              }}
            >
              <Text style={{ color: colors.surface, fontSize: 12, fontWeight: typography.fontWeight.bold }}>
                {provider.initials}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.text,
                borderRadius: radius.pill,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: colors.surface, fontSize: 10 }}>{provider.eta}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={{ color: colors.muted, fontSize: typography.fontSize.xs }}>
        Nearby verified providers
      </Text>
    </View>
  );
}

export function HomeTriage({ onSelectCategory, onChangeAddress }) {
  const address = '1010 Vienna, AT';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      testID="home-triage-screen"
    >
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <AddressPill address={address} onPress={onChangeAddress} />

        {/* Profile avatar placeholder */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.surface, fontSize: 16 }}>👤</Text>
        </View>
      </View>

      {/* Greeting */}
      <Text
        style={{
          color: colors.text,
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.semibold,
          marginBottom: spacing.lg,
          lineHeight: 36,
        }}
      >
        Hello! Where do you need help?
      </Text>

      {/* Service category cards — 2 column grid */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {SERVICE_CATEGORIES.map((category) => (
          <ServiceCard
            key={category.id}
            category={category}
            onPress={onSelectCategory ?? (() => {})}
          />
        ))}
      </View>

      {/* Map peek */}
      <MapPeek />
    </ScrollView>
  );
}

export default HomeTriage;
