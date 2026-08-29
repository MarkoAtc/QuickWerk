import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { BookingWizard } from '../src/features/booking/booking-wizard-screen';
import { submitBooking } from '../src/features/booking/booking-wizard-actions';
import {
  deriveCustomerBookingLayout,
  resolveCustomerBookingBottomPadding,
} from '../src/shared/customer-booking-layout';
import { resolveSessionToken, useSession } from '../src/shared/session-provider';
import { useResponsiveLayout } from '../src/shared/use-responsive-layout';

const DEFAULT_ADDRESS = '1010 Vienna, AT';

export default function BookingWizardRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const safeAreaInsets = useSafeAreaInsets();
  const layout = deriveCustomerBookingLayout(useResponsiveLayout());
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
      <View
        accessibilityElementsHidden={isEditingAddress}
        importantForAccessibility={isEditingAddress ? 'no-hide-descendants' : 'auto'}
        style={{ flex: 1 }}
      >
        <BookingWizard
          category={params.category}
          address={address}
          onComplete={handleComplete}
          onBack={() => router.back()}
          onEdit={openAddressEditor}
          isSubmitting={loading}
          errorMessage={error}
        />
      </View>
      {isEditingAddress ? (
        <KeyboardAvoidingView
          accessibilityViewIsModal
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
          testID="booking-wizard-address-editor"
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: layout.contentGutter,
              paddingTop: layout.sectionPadding,
              paddingBottom: resolveCustomerBookingBottomPadding(layout, safeAreaInsets.bottom),
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
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
                  minHeight: layout.minimumControlHeight,
                }}
              />
              <View style={{ flexDirection: layout.editorActionDirection, gap: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsEditingAddress(false)}
                  testID="booking-wizard-address-cancel"
                  style={{
                    flex: layout.editorActionDirection === 'row' ? 1 : undefined,
                    minHeight: layout.minimumControlHeight,
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
                  testID="booking-wizard-address-save"
                  style={{
                    flex: layout.editorActionDirection === 'row' ? 1 : undefined,
                    minHeight: layout.minimumControlHeight,
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}
