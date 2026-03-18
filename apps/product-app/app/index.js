import { Text, View } from 'react-native';

import { productAppShell } from '../src/shared/app-shell';

export default function ProductHomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: productAppShell.theme.color.surface,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: '600',
          marginBottom: 12,
          color: productAppShell.theme.color.primary,
        }}
      >
        {productAppShell.appName}
      </Text>
      <Text style={{ color: productAppShell.theme.color.text }}>
        Shared product shell for web, iOS, and Android.
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
        Shared domain role: {productAppShell.onboardingRoles[0]} · Initial booking state:{' '}
        {productAppShell.initialBookingStatus}
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>
        Provider onboarding: {productAppShell.onboardingSteps.length} shared steps · First step:{' '}
        {productAppShell.onboardingSteps[0].label}
      </Text>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
        Session: {productAppShell.sessionState} · Auth entry: {productAppShell.authEntryStep.label} · Public
        routes: {productAppShell.publicAuthRoutes.length}
      </Text>
    </View>
  );
}