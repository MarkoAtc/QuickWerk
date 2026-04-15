import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { BookingWizard } from '../src/features/booking/booking-wizard-screen';
import { submitBooking } from '../src/features/booking/booking-wizard-actions';
import { resolveSessionToken, useSession } from '../src/shared/session-provider';

const DEFAULT_ADDRESS = '1010 Vienna, AT';

export default function BookingWizardRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const addressParam = Array.isArray(params.address) ? params.address[0] : params.address;
  const [address, setAddress] = useState(
    typeof addressParam === 'string' && addressParam.trim() ? addressParam.trim() : DEFAULT_ADDRESS,
  );
  const [draftAddress, setDraftAddress] = useState(address);
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

  const handleComplete = async ({ issueType, urgency, address }) => {
    if (loading) return;

    const token = resolveSessionToken(session);
    if (!token) {
      setError('Your session has expired. Please sign in again.');
      router.replace('/auth');
      return;
    }

    setLoading(true);
    setError(null);

    // When coming from provider detail, include the provider context in the service request.
    const providerUserIdParam = Array.isArray(params.providerUserId)
      ? params.providerUserId[0]
      : params.providerUserId;
    const providerHint = providerUserIdParam ? `[provider:${providerUserIdParam}]` : undefined;
    const result = await submitBooking(
      { issueType, urgency, address, category: params.category, providerHint },
      token,
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace({
      pathname: '/active-job',
      params: { bookingId: result.bookingId },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <BookingWizard
        category={params.category}
        address={address}
        onComplete={handleComplete}
        onBack={() => router.back()}
        onEdit={openAddressEditor}
        isSubmitting={loading}
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
            Update booking location
          </Text>
          <TextInput
            accessibilityLabel="Booking location"
            autoFocus
            onChangeText={setDraftAddress}
            placeholder="Enter city or service area"
            placeholderTextColor="#94A3B8"
            testID="booking-wizard-address-input"
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
              testID="booking-wizard-address-save"
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
      {error ? (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 16,
            right: 16,
            backgroundColor: '#FEE2E2',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <Text style={{ color: '#B91C1C', textAlign: 'center', fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
