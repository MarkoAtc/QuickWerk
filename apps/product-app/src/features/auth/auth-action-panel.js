import { Pressable, Text, View } from 'react-native';

import { productAppShell } from '../../shared/app-shell';

function FieldPreview({ label, value }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: productAppShell.theme.color.primary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <View
        style={{
          marginTop: 4,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: productAppShell.theme.color.primary,
        }}
      >
        <Text style={{ color: productAppShell.theme.color.text }}>{value}</Text>
      </View>
    </View>
  );
}

const createPanelContent = (actionId, authEntryState) => {
  switch (actionId) {
    case 'sign-in':
      return {
        title: 'Sign in screen stub',
        description: 'A tiny local sign-in surface keeps the shared product app mobile-first without adding real auth wiring yet.',
        fields: [
          ['Email address', 'marko@quickwerk.local'],
          ['Password', '••••••••'],
        ],
        buttonLabel: 'Continue with sign in',
        footerNote: 'Need recovery instead? Switch to Password Reset below.',
      };
    case 'sign-up':
      return {
        title: 'Sign up screen stub',
        description: 'This local account creation state reserves space for provider onboarding without expanding into a full registration flow.',
        fields: [
          ['Full name', 'Marta Meister'],
          ['Email address', 'team@quickwerk.local'],
          ['Password', '••••••••'],
        ],
        buttonLabel: 'Create shared account',
        footerNote: `After account creation, continue into ${authEntryState.recommendedOnboardingStep}.`,
      };
    case 'password-reset':
      return {
        title: 'Password reset screen stub',
        description: 'This local recovery state keeps the auth boundary visible while the real reset flow is still out of scope.',
        fields: [['Email address', 'marko@quickwerk.local']],
        buttonLabel: 'Send reset link',
        footerNote: 'Keep recovery local for now; real delivery can come with later auth routing.',
      };
    default:
      return {
        title: 'Marketplace continuation stub',
        description: 'Authenticated users can continue into the shared marketplace shell from this client-local state.',
        fields: [
          ['Session state', authEntryState.sessionState],
          ['Recommended onboarding step', authEntryState.recommendedOnboardingStep],
        ],
        buttonLabel: 'Open marketplace shell',
        footerNote: 'Real marketplace routing can replace this stub later without reworking the auth entry state.',
      };
  }
};

export function AuthActionPanel({ actionId, authEntryState }) {
  const panelContent = createPanelContent(actionId, authEntryState);

  return (
    <View
      testID={`auth-action-panel-${actionId}`}
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: productAppShell.theme.color.surface,
      }}
    >
      <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '600' }}>{panelContent.title}</Text>
      <Text style={{ marginTop: 6, color: productAppShell.theme.color.text }}>{panelContent.description}</Text>
      {panelContent.fields.map(([label, value]) => (
        <FieldPreview key={label} label={label} value={value} />
      ))}
      <Pressable
        accessibilityHint="Disabled placeholder for a future auth submission action."
        accessibilityLabel={panelContent.buttonLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        testID={`auth-action-panel-cta-${actionId}`}
        style={{
          marginTop: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: productAppShell.theme.color.primary,
          opacity: authEntryState.isLoading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: productAppShell.theme.color.surface, fontWeight: '600' }}>{panelContent.buttonLabel}</Text>
      </Pressable>
      <Text style={{ marginTop: 8, color: productAppShell.theme.color.text }}>{panelContent.footerNote}</Text>
    </View>
  );
}