import { Stack } from 'expo-router';

import { SessionProvider } from '../src/shared/session-provider';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}