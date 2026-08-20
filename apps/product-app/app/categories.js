import { useLocalSearchParams, useRouter } from 'expo-router';

import { ServiceCategories } from '../src/features/marketplace/service-categories-screen';

export default function ProductCategoriesRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const address = Array.isArray(params.address) ? params.address[0] : params.address;

  return (
    <ServiceCategories
      onBack={() => router.back()}
      onSelectCategory={(categoryId) => {
        router.push({ pathname: '/booking-wizard', params: { category: categoryId, address } });
      }}
    />
  );
}
