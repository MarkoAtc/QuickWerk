import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

const CATEGORY_CHIPS = [
  { id: 'plumbing', label: 'Plumber', icon: '🔧' },
  { id: 'electrical', label: 'Electrician', icon: '⚡' },
  { id: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { id: 'painting', label: 'Painter', icon: '🎨' },
];

const MAP_MARKERS = [
  { id: 'plumber', label: 'Plumber $85/hr', top: '35%', left: '38%' },
  { id: 'electrician', label: 'Electrician $90/hr', top: '52%', left: '64%' },
  { id: 'carpenter', label: 'Carpenter $75/hr', top: '24%', left: '18%' },
];

const CURATED_MATCHES = [
  {
    id: 'marcus-weber',
    name: 'Marcus Weber',
    initials: 'MW',
    specialty: 'Master Electrician',
    rating: '4.9',
    distance: '2.4km',
    rate: '$90/hr',
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    initials: 'SC',
    specialty: 'Licensed Plumber',
    rating: '4.8',
    distance: '1.2km',
    rate: '$85/hr',
  },
  {
    id: 'tom-jenkins',
    name: 'Tom Jenkins',
    initials: 'TJ',
    specialty: 'Expert Carpenter',
    rating: '5.0',
    distance: '3.8km',
    rate: '$75/hr',
  },
];

function Header({ address, onChangeAddress }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.container,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
      }}
    >
      <Pressable
        accessibilityLabel={`Current location: ${address}. Tap to change.`}
        accessibilityRole="button"
        onPress={onChangeAddress}
        testID="home-triage-address-pill"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 }}
      >
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: typography.fontWeight.bold, letterSpacing: -0.4 }}>
          QuickWerk
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }} numberOfLines={1}>
          · {address}
        </Text>
      </Pressable>

      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          backgroundColor: colors.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.secondaryBright,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16 }}>👤</Text>
      </View>
    </View>
  );
}

function MapMarker({ marker }) {
  return (
    <View style={{ position: 'absolute', top: marker.top, left: marker.left, alignItems: 'center' }}>
      <View
        style={{
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          backgroundColor: colors.secondaryBright,
          marginBottom: spacing.xs,
          ...shadow.card,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold, whiteSpace: 'nowrap' }}>
          {marker.label}
        </Text>
      </View>
      <Text style={{ color: colors.secondaryBright, fontSize: 22 }}>📍</Text>
    </View>
  );
}

function SearchBar() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        ...shadow.elevated,
      }}
    >
      <Text style={{ fontSize: 16 }}>🔍</Text>
      <TextInput
        editable={false}
        placeholder="Search for professionals..."
        placeholderTextColor={colors.textMuted}
        style={{ flex: 1, fontSize: typography.fontSize.bodyMd, color: colors.text }}
        testID="home-triage-search-input"
      />
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.md,
          backgroundColor: colors.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 14 }}>⚙️</Text>
      </View>
    </View>
  );
}

function CategoryChip({ chip, isSelected, onPress }) {
  return (
    <Pressable
      accessibilityLabel={chip.label}
      accessibilityRole="button"
      onPress={() => onPress(chip.id)}
      testID={`home-triage-chip-${chip.id}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: isSelected ? colors.secondaryBright : 'rgba(255,255,255,0.9)',
          borderWidth: isSelected ? 0 : 1,
          borderColor: colors.outlineVariant,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 14 }}>{chip.icon}</Text>
        <Text
          style={{
            color: isSelected ? '#FFFFFF' : colors.text,
            fontSize: typography.fontSize.labelMd,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          {chip.label}
        </Text>
      </View>
    </Pressable>
  );
}

function SosButton({ onPress }) {
  return (
    <Pressable
      accessibilityLabel="Request emergency help"
      accessibilityRole="button"
      onPress={onPress}
      testID="home-triage-sos"
      style={{ position: 'absolute', right: spacing.container, top: '50%', marginTop: -32, zIndex: 30 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.full,
          backgroundColor: colors.cta,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 4,
          borderColor: '#FFFFFF',
          ...shadow.elevated,
        }}
      >
        <Text style={{ fontSize: 20 }}>⚠️</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: typography.fontWeight.bold, letterSpacing: 1 }}>SOS</Text>
      </View>
    </Pressable>
  );
}

function MatchCard({ match, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} testID={`home-triage-match-${match.id}`} style={{ width: 260 }}>
      <View
        style={{
          borderRadius: 24,
          padding: spacing.md,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          ...shadow.elevated,
        }}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.lg,
              backgroundColor: `${colors.secondaryBright}14`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.secondaryBright, fontSize: 18, fontWeight: typography.fontWeight.bold }}>
              {match.initials}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ color: colors.text, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold, flexShrink: 1 }}>
                {match.name}
              </Text>
              <View
                style={{
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 2,
                  backgroundColor: 'rgba(255, 214, 0, 0.2)',
                }}
              >
                <Text style={{ color: '#8A6500', fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold }}>
                  ★ {match.rating}
                </Text>
              </View>
            </View>
            <Text style={{ marginTop: 2, color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>{match.specialty}</Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.labelMd }}>📍 {match.distance}</Text>
          <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.bodyLg, fontWeight: typography.fontWeight.bold }}>
            {match.rate}
          </Text>
        </View>

        <View
          style={{
            marginTop: spacing.sm,
            borderRadius: radius.md,
            paddingVertical: spacing.sm,
            backgroundColor: colors.secondaryBright,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold }}>Book Instantly</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HomeTriage({ address = '1010 Vienna, AT', onSelectCategory, onChangeAddress, onBrowseProviders }) {
  const [selectedChip, setSelectedChip] = useState(CATEGORY_CHIPS[0].id);

  const handleSelectCategory = (categoryId) => {
    setSelectedChip(categoryId);
    (onSelectCategory ?? (() => {}))(categoryId);
  };

  const handleMatchPress = onBrowseProviders ?? (() => {});

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="home-triage-screen">
      <Header address={address} onChangeAddress={onChangeAddress} />

      <View style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#E5E7EB', paddingTop: 64 }}>
        <View
          style={{
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#E5E7EB',
          }}
        >
          {MAP_MARKERS.map((marker) => (
            <MapMarker key={marker.id} marker={marker} />
          ))}
        </View>

        <View style={{ zIndex: 20, paddingHorizontal: spacing.container, paddingTop: spacing.md, gap: spacing.sm }}>
          <SearchBar />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {CATEGORY_CHIPS.map((chip) => (
              <CategoryChip key={chip.id} chip={chip} isSelected={selectedChip === chip.id} onPress={handleSelectCategory} />
            ))}
          </ScrollView>
        </View>

        <SosButton onPress={() => handleSelectCategory('emergency')} />

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: spacing.xl, zIndex: 20 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.container }}
          >
            {CURATED_MATCHES.map((match) => (
              <MatchCard key={match.id} match={match} onPress={handleMatchPress} />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

export default HomeTriage;
