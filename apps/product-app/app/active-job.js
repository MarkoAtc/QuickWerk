import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActiveJob } from '../src/features/booking/active-job-screen';

export default function ActiveJobRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const booking = {
    providerName: params.providerName ?? 'David',
    etaMin: Number(params.etaMin ?? 12),
    delayed: params.delayed === 'true',
    delayMin: Number(params.delayMin ?? 5),
  };

  return (
    <ActiveJob
      booking={booking}
      onChat={() => {
        // TODO: open in-app chat
      }}
      onCall={() => {
        // TODO: initiate call
      }}
    />
  );
}
