import { useLocalSearchParams } from 'expo-router';

import { DiscoveryScreen } from '../src/features/discovery/discovery-screen';

export default function ProductDiscoveryRoute() {
  const params = useLocalSearchParams();

  const initialTradeCategory = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const initialLocation = Array.isArray(params.location)
    ? params.location[0]
    : params.location;

  return (
    <DiscoveryScreen
      initialTradeCategory={typeof initialTradeCategory === 'string' ? initialTradeCategory : undefined}
      initialLocation={typeof initialLocation === 'string' ? initialLocation : undefined}
    />
  );
}
