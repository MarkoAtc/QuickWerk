import { useState } from 'react';
import { Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { BookingWizard } from '../src/features/booking/booking-wizard-screen';
import { submitBooking } from '../src/features/booking/booking-wizard-actions';
import { useSession } from '../src/shared/session-provider';

export default function BookingWizardRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleComplete = async ({ issueType, urgency, address }) => {
    if (loading) return;
    const token = session.status === 'authenticated' ? session.token : null;
    setLoading(true);
    setError(null);

    const result = await submitBooking(
      { issueType, urgency, address, category: params.category },
      token,
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace({
      pathname: '/active-job',
      params: { bookingId: result.bookingId, providerName: 'Finding your pro...' },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <BookingWizard
        category={params.category}
        onComplete={handleComplete}
        onBack={() => router.back()}
      />
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
