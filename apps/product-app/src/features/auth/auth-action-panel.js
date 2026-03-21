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
        title: 'Returning customer sign in',
        description: 'Fast login path optimized for users who already know exactly what they need.',
        fields: [
          ['Email address', 'marko@quickwerk.local'],
          ['Password', '••••••••'],
        ],
        buttonLabel: 'Continue to dashboard',
        footerNote: 'Ideal for repeat customers who book frequently.',
      };
    case 'sign-up':
      return {
        title: 'New customer registration',
        description: 'Simple account creation flow for first-time QuickWerk customers.',
        fields: [
          ['Full name', 'Marta Meister'],
          ['Email address', 'team@quickwerk.local'],
          ['Password', '••••••••'],
        ],
        buttonLabel: 'Create account',
        footerNote: `Next step after signup: ${authEntryState.recommendedOnboardingStep}.`,
      };
    case 'password-reset':
      return {
        title: 'Password recovery',
        description: 'Quick recovery path that keeps customers in flow and minimizes drop-off.',
        fields: [['Email address', 'marko@quickwerk.local']],
        buttonLabel: 'Send reset link',
        footerNote: 'Recovery can be completed without leaving the app journey.',
      };
    default:
      return {
        title: 'Continue to marketplace',
        description: 'Authenticated users continue directly to provider discovery and booking.',
        fields: [
          ['Session state', authEntryState.sessionState],
          ['Suggested next step', authEntryState.recommendedOnboardingStep],
        ],
        buttonLabel: 'Open marketplace',
        footerNote: 'This keeps the client conversation focused on customer value, not backend internals.',
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
        accessibilityHint="Preview action for the selected auth path."
        accessibilityLabel={panelContent.buttonLabel}
        accessibilityRole="button"
        testID={`auth-action-panel-cta-${actionId}`}
        style={{
          marginTop: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: productAppShell.theme.color.primary,
          opacity: authEntryState.isLoading ? 0.75 : 0.95,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{panelContent.buttonLabel}</Text>
      </Pressable>

      <Text style={{ marginTop: 8, color: '#475569' }}>{panelContent.footerNote}</Text>
    </View>
  );
}
