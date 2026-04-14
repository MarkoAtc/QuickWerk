import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthActionPanel } from './auth-action-panel';
import { productAppShell } from '../../shared/app-shell';

const formatActionLabel = (action) =>
  action
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function AuthEntrySection({ authEntryState, actionStatusMessage, isSubmitting, onPrimaryActionPress }) {
  const [selectedActionId, setSelectedActionId] = useState(authEntryState.primaryActionId);

  useEffect(() => {
    setSelectedActionId(authEntryState.primaryActionId);
  }, [authEntryState.primaryActionId]);

  return (
    <View
      testID="auth-entry-section"
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D7DFEA',
        shadowColor: '#0F172A',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <Text style={{ color: productAppShell.theme.color.primary, fontSize: 22, fontWeight: '700' }}>
        {authEntryState.primaryActionLabel}
      </Text>
      <Text style={{ marginTop: 6, color: '#334155' }}>
        Choose a customer path and preview how the first interaction with QuickWerk will feel in production.
      </Text>
      <Text testID="auth-entry-onboarding-step" style={{ marginTop: 6, color: '#475569' }}>
        Next onboarding checkpoint: {authEntryState.recommendedOnboardingStep}
      </Text>

      <Pressable
        accessibilityHint="Highlights the primary auth action for this demo state."
        accessibilityLabel={authEntryState.primaryActionLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: authEntryState.isLoading, selected: selectedActionId === authEntryState.primaryActionId }}
        disabled={authEntryState.isLoading}
        onPress={() => setSelectedActionId(authEntryState.primaryActionId)}
        testID="auth-entry-primary-action"
        style={{
          marginTop: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: '#EFF6FF',
          borderWidth: 1,
          borderColor: '#BFDBFE',
          opacity: authEntryState.isLoading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '700' }}>{authEntryState.primaryActionLabel}</Text>
        <Text style={{ marginTop: 4, color: '#334155' }}>Primary recommended path for this user context.</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {authEntryState.availableActions.map((action) => {
          const selected = selectedActionId === action;

          return (
            <Pressable
              key={action}
              accessibilityHint="Switches the auth demo panel to this user action."
              accessibilityLabel={formatActionLabel(action)}
              accessibilityRole="button"
              accessibilityState={{ disabled: authEntryState.isLoading, selected }}
              disabled={authEntryState.isLoading}
              onPress={() => setSelectedActionId(action)}
              testID={`auth-entry-action-${action}`}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? '#1D4ED8' : '#CBD5E1',
                backgroundColor: selected ? '#1D4ED8' : '#FFFFFF',
                opacity: authEntryState.isLoading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: selected ? '#FFFFFF' : '#334155', fontWeight: selected ? '600' : '500' }}>
                {formatActionLabel(action)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AuthActionPanel
        actionId={selectedActionId}
        authEntryState={authEntryState}
        isSubmitting={isSubmitting}
        onPrimaryActionPress={selectedActionId === 'sign-in' ? onPrimaryActionPress : undefined}
      />

      {actionStatusMessage ? (
        <Text testID="auth-entry-action-status" style={{ marginTop: 10, color: '#0F766E' }}>
          {actionStatusMessage}
        </Text>
      ) : null}

      <Text testID="auth-entry-helper-text" style={{ marginTop: 10, color: '#475569' }}>
        {authEntryState.helperText}
      </Text>
      {authEntryState.errorMessage ? (
        <Text testID="auth-entry-error-message" style={{ marginTop: 8, color: '#B26A00' }}>
          Session bootstrap is degraded: {authEntryState.errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
