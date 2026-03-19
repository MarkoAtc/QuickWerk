import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthActionPanel } from './auth-action-panel';
import { productAppShell } from '../../shared/app-shell';

const formatActionLabel = (action) =>
  action
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function AuthEntrySection({ authEntryState }) {
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
        {authEntryState.primaryStatus} · {authEntryState.isLoading ? 'loading' : authEntryState.source}
      </Text>
      <Text testID="auth-entry-onboarding-step" style={{ marginTop: 6, color: '#334155' }}>
        Recommended onboarding step: {authEntryState.recommendedOnboardingStep}
      </Text>

      <Pressable
        accessibilityHint="Previews the primary local auth surface."
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
        <Text style={{ marginTop: 4, color: '#334155' }}>Tap to preview the primary auth surface.</Text>
      </Pressable>

      <Text testID="auth-entry-status" style={{ marginTop: 10, color: '#334155' }}>
        State token: {authEntryState.sessionState}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {authEntryState.availableActions.map((action) => {
          const selected = selectedActionId === action;

          return (
            <Pressable
              key={action}
              accessibilityHint="Previews this local auth surface."
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

      <AuthActionPanel actionId={selectedActionId} authEntryState={authEntryState} />

      <Text testID="auth-entry-helper-text" style={{ marginTop: 10, color: '#475569' }}>
        {authEntryState.helperText}
      </Text>
      {authEntryState.errorMessage ? (
        <Text testID="auth-entry-error-message" style={{ marginTop: 8, color: '#B26A00' }}>
          Bootstrap fallback: {authEntryState.errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
