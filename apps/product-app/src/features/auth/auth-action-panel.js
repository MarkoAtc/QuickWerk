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
        description: 'Fast returning-customer entry, now wired to a real session token endpoint.',
        fields: [
          ['Email address', 'customer.demo@quickwerk.local'],
          ['Role', 'customer'],
        ],
        buttonLabel: 'Continue with sign in',
        footerNote: 'This action performs a live sign-in call against platform-api.',
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

export function AuthActionPanel({ actionId, authEntryState, isSubmitting, onPrimaryActionPress }) {
  const panelContent = createPanelContent(actionId, authEntryState);
  const isActionEnabled = actionId === 'sign-in' && !authEntryState.isLoading && !isSubmitting;

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
        accessibilityHint={
          isActionEnabled
            ? 'Performs a live sign-in against platform-api and refreshes session state.'
            : 'Disabled placeholder for a future auth submission action.'
        }
        accessibilityLabel={panelContent.buttonLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isActionEnabled }}
        disabled={!isActionEnabled}
        onPress={onPrimaryActionPress}
        testID={`auth-action-panel-cta-${actionId}`}
        style={{
          marginTop: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: productAppShell.theme.color.primary,
          opacity: isActionEnabled ? 1 : 0.7,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
          {isSubmitting ? 'Signing in…' : panelContent.buttonLabel}
        </Text>
      </Pressable>

      <Text style={{ marginTop: 8, color: '#475569' }}>{panelContent.footerNote}</Text>
    </View>
  );
}
