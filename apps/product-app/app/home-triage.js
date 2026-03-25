import { useRouter } from 'expo-router';

import { HomeTriage } from '../src/features/marketplace/home-triage-screen';

export default function HomeTriageRoute() {
  const router = useRouter();

  return (
    <HomeTriage
      onSelectCategory={(categoryId) => {
        router.push({ pathname: '/booking-wizard', params: { category: categoryId } });
      }}
      onChangeAddress={() => {
        // TODO: open location picker modal
      }}
    />
  );
}
