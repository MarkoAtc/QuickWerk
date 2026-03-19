import { Pressable, Text, View } from 'react-native';

import { productAppShell } from '../../shared/app-shell';

function FieldPreview({ label, value }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <View
        style={{
          marginTop: 4,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#D7DFEA',
          backgroundColor: '#FFFFFF',
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
        title: 'Sign in',
        description: 'Fast returning-customer entry, optimized for quick mobile access.',
        fields: [
          ['Email address', 'marko@quickwerk.local'],
          ['Password', '••••••••'],
        ],
        buttonLabel: 'Continue with sign in',
        footerNote: 'Need recovery instead? Switch to Password Reset.',
      };
    case 'sign-up':
      return {
        title: 'Create account',
        description: 'Shared registration surface reserved for future onboarding integration.',
        fields: [
          ['Full name', 'Marta Meister'],
          ['Email address', 'team@quickwerk.local'],
          ['Password', '••••••••'],
        ],
        buttonLabel: 'Create account',
        footerNote: `Next step after account creation: ${authEntryState.recommendedOnboardingStep}.`,
      };
    case 'password-reset':
      return {
        title: 'Reset password',
        description: 'Recovery surface for users who lost access credentials.',
        fields: [['Email address', 'marko@quickwerk.local']],
        buttonLabel: 'Send reset link',
        footerNote: 'Real delivery wiring can be connected in a later auth slice.',
      };
    default:
      return {
        title: 'Continue to marketplace',
        description: 'Authenticated users continue into provider discovery and booking preview.',
        fields: [
          ['Session state', authEntryState.sessionState],
          ['Recommended onboarding step', authEntryState.recommendedOnboardingStep],
        ],
        buttonLabel: 'Open marketplace',
        footerNote: 'This remains demo-safe and can be swapped to real routing later.',
      };
  }
};

export function AuthActionPanel({ actionId, authEntryState }) {
  const panelContent = createPanelContent(actionId, authEntryState);

  return (
    <View
      testID={`auth-action-panel-${actionId}`}
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#D7DFEA',
      }}
    >
      <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '700', fontSize: 17 }}>{panelContent.title}</Text>
      <Text style={{ marginTop: 6, color: '#334155' }}>{panelContent.description}</Text>

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
          marginTop: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: productAppShell.theme.color.primary,
          opacity: authEntryState.isLoading ? 0.7 : 0.8,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{panelContent.buttonLabel}</Text>
      </Pressable>

      <Text style={{ marginTop: 8, color: '#475569' }}>{panelContent.footerNote}</Text>
    </View>
  );
}
