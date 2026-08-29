import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import { HomeTriage } from '../src/features/marketplace/home-triage-screen';
import { deriveCustomerDiscoveryLayout } from '../src/shared/customer-discovery-layout';
import { useResponsiveLayout } from '../src/shared/use-responsive-layout';

const DEFAULT_ADDRESS = '1010 Vienna, AT';

export default function HomeTriageRoute() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const layout = deriveCustomerDiscoveryLayout(useResponsiveLayout());
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [draftAddress, setDraftAddress] = useState(DEFAULT_ADDRESS);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const openAddressEditor = () => {
    setDraftAddress(address);
    setIsEditingAddress(true);
  };

  const commitAddress = () => {
    const nextAddress = draftAddress.trim();
    setAddress(nextAddress || DEFAULT_ADDRESS);
    setIsEditingAddress(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <HomeTriage
        address={address}
        onSelectCategory={(categoryId) => {
          router.push({
            pathname: '/booking-wizard',
            params: { category: categoryId, address },
          });
        }}
        onChangeAddress={openAddressEditor}
        onBrowseProviders={() => {
          router.push({ pathname: '/discovery', params: { location: address } });
        }}
        onOpenCategories={() => {
          router.push({ pathname: '/categories', params: { address } });
        }}
      />

      {isEditingAddress ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '85%',
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
          testID="home-triage-address-editor"
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: layout.contentGutter,
              paddingTop: layout.sectionPadding,
              paddingBottom: Math.max(layout.sectionPadding, safeAreaInsets.bottom + 12),
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Update service location
            </Text>
            <TextInput
              accessibilityLabel="Service location"
              autoFocus
              onChangeText={setDraftAddress}
              placeholder="Enter city or service area"
              placeholderTextColor="#94A3B8"
              testID="home-triage-address-input"
              value={draftAddress}
              style={{
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: layout.isPhone ? 'column' : 'row', gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsEditingAddress(false)}
                style={{
                  flex: layout.isPhone ? undefined : 1,
                  minHeight: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#334155', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={commitAddress}
                testID="home-triage-address-save"
                style={{
                  flex: layout.isPhone ? undefined : 1,
                  minHeight: 44,
                  borderRadius: 10,
                  backgroundColor: '#16A34A',
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}
