import { Redirect } from 'expo-router';

import { useSession } from '../src/shared/session-provider';

export default function ProductHomeScreen() {
  const { session } = useSession();

  if (session.status === 'authenticated') {
    if (session.role === 'provider') {
      return <Redirect href="/provider" />;
    }
    return <Redirect href="/home-triage" />;
  }

  return <Redirect href="/auth" />;
}
