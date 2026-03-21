import { Redirect } from 'expo-router';

import { sessionStore } from '../src/shared/session-context';

export default function ProductHomeScreen() {
  const session = sessionStore.get();

  if (session.status === 'authenticated') {
    if (session.role === 'provider') {
      return <Redirect href="/provider" />;
    }
    return <Redirect href="/booking" />;
  }

  return <Redirect href="/sign-in" />;
}
