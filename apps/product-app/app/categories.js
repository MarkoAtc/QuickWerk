import { useRouter } from 'expo-router';

import { ServiceCategories } from '../src/features/marketplace/service-categories-screen';

export default function ProductCategoriesRoute() {
  const router = useRouter();

  return (
    <ServiceCategories
      onBack={() => router.back()}
      onSelectCategory={(categoryId) => {
        router.push({ pathname: '/booking-wizard', params: { category: categoryId } });
      }}
    />
  );
}
