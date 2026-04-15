import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useRouter } from 'expo-router';

import { HomeTriage } from '../src/features/marketplace/home-triage-screen';

const DEFAULT_ADDRESS = '1010 Vienna, AT';

export default function HomeTriageRoute() {
  const router = useRouter();
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
      />

      {isEditingAddress ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
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
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsEditingAddress(false)}
              style={{
                flex: 1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#334155', fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={commitAddress}
              testID="home-triage-address-save"
              style={{
                flex: 1,
                borderRadius: 10,
                backgroundColor: '#16A34A',
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
