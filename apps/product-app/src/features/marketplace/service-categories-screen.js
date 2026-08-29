import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@quickwerk/ui';

import { deriveCustomerDiscoveryLayout } from '../../shared/customer-discovery-layout';
import { useResponsiveLayout } from '../../shared/use-responsive-layout';

const CATEGORIES = [
  { id: 'emergency', label: 'Emergency', description: 'Immediate help', icon: '🚨', emphasis: true },
  { id: 'plumbing', label: 'Plumbing', description: 'Pipes, water, heating', icon: '🔧' },
  { id: 'electrical', label: 'Electrical', description: 'Power & wiring', icon: '⚡' },
  { id: 'carpenter', label: 'Carpentry', description: 'Woodwork & furniture', icon: '🪚' },
  { id: 'locksmith', label: 'Locksmith', description: 'Lockouts & security', icon: '🔑' },
  { id: 'painting', label: 'Painting', description: 'Walls & facades', icon: '🎨' },
  { id: 'cleaning', label: 'Cleaning', description: 'Home & office', icon: '✨' },
  { id: 'handyman', label: 'Handyman', description: 'Small repairs', icon: '🛠️' },
];

function CategoryTile({ category, layout, onPress }) {
  return (
    <Pressable
      accessibilityLabel={`${category.label}. ${category.description}.`}
      accessibilityRole="button"
      onPress={() => onPress(category.id)}
      style={{ width: layout.categoryTileWidth }}
      testID={`categories-tile-${category.id}`}
    >
      <View
        style={{
          borderRadius: radius.lg,
          padding: layout.isPhone ? spacing.md : spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: category.emphasis ? colors.error : colors.outlineVariant,
          borderLeftWidth: category.emphasis ? 4 : 1,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: category.emphasis ? `${colors.error}14` : colors.surfaceContainer,
            }}
          >
            <Text style={{ fontSize: 20 }}>{category.icon}</Text>
          </View>
          {category.emphasis ? (
            <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.error }} />
          ) : null}
        </View>

        <Text
          style={{
            marginTop: spacing.md,
            color: category.emphasis ? colors.error : colors.text,
            fontSize: typography.fontSize.headlineSm,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          {category.label}
        </Text>
        <Text style={{ marginTop: 2, color: colors.textMuted, fontSize: typography.fontSize.labelMd }}>
          {category.description}
        </Text>
      </View>
    </Pressable>
  );
}

export function ServiceCategories({ onSelectCategory, onBack }) {
  const layout = deriveCustomerDiscoveryLayout(useResponsiveLayout());

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: layout.contentGutter,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="categories-screen"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable accessibilityRole="button" onPress={onBack} testID="categories-back">
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.bodySm }}>← Back</Text>
        </Pressable>

        <Text style={{ flex: 1, textAlign: 'center', color: colors.text, fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold }}>
          Choose a service
        </Text>

        <View
          style={{
            width: layout.isPhone ? 36 : 40,
            height: layout.isPhone ? 36 : 40,
            borderRadius: radius.full,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16 }}>👤</Text>
        </View>
      </View>

      <Text style={{ color: colors.secondaryBright, fontSize: typography.fontSize.labelMd, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase', letterSpacing: 1 }}>
        Premium Service
      </Text>
      <Text style={{ marginTop: spacing.xs, color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: typography.fontWeight.bold, letterSpacing: -0.5 }}>
        What service do you need today?
      </Text>
      <Text style={{ marginTop: spacing.sm, color: colors.textSoft, fontSize: typography.fontSize.bodyMd, lineHeight: typography.lineHeight.bodyMd }}>
        Choose a category to find available professionals near you right away.
      </Text>

      <View style={{ marginTop: spacing.lg, height: 4, borderRadius: radius.full, backgroundColor: colors.outlineVariant, overflow: 'hidden' }}>
        <View style={{ width: '25%', height: '100%', backgroundColor: colors.secondaryBright }} />
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <TextInput
          editable={false}
          placeholder="Search for professionals or services..."
          placeholderTextColor={colors.textMuted}
          style={{
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: typography.fontSize.bodyMd,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
          testID="categories-search-input"
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md, marginTop: spacing.xl }}>
        {CATEGORIES.map((category) => (
          <CategoryTile key={category.id} category={category} layout={layout} onPress={onSelectCategory ?? (() => {})} />
        ))}
      </View>

      <View
        style={{
          marginTop: spacing.xl,
          borderRadius: 24,
          padding: layout.sectionPadding,
          backgroundColor: colors.primaryContainer,
          ...shadow.elevated,
        }}
        testID="categories-promo"
      >
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            backgroundColor: colors.secondaryBright,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.labelSm, fontWeight: typography.fontWeight.bold }}>
            Coming soon: Premium Plus
          </Text>
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: typography.fontSize.headlineSm, fontWeight: typography.fontWeight.bold }}>
          A higher tier of vetted pros.
        </Text>
        <Text style={{ marginTop: spacing.xs, color: 'rgba(255,255,255,0.75)', fontSize: typography.fontSize.bodySm, lineHeight: typography.lineHeight.bodySm }}>
          We're building extra vetting and buyer protections for select bookings. Details land here once the terms are finalized.
        </Text>
      </View>
    </ScrollView>
  );
}

export default ServiceCategories;
