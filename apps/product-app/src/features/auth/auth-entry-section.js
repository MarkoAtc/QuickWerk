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
        backgroundColor: productAppShell.theme.color.primary,
      }}
    >
      <Text style={{ color: productAppShell.theme.color.surface, fontSize: 18, fontWeight: '600' }}>
        {authEntryState.primaryActionLabel}
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
          marginTop: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: productAppShell.theme.color.surface,
          opacity: authEntryState.isLoading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '600' }}>
          {authEntryState.primaryActionLabel}
        </Text>
        <Text style={{ marginTop: 4, color: productAppShell.theme.color.text }}>
          Tap to preview the next local auth surface.
        </Text>
      </Pressable>
      <Text testID="auth-entry-status" style={{ marginTop: 8, color: productAppShell.theme.color.surface }}>
        {authEntryState.primaryStatus} · {authEntryState.isLoading ? 'loading' : authEntryState.source}
      </Text>
      <Text testID="auth-entry-onboarding-step" style={{ marginTop: 8, color: productAppShell.theme.color.surface }}>
        Recommended onboarding step: {authEntryState.recommendedOnboardingStep}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {authEntryState.availableActions.map((action) => (
          <Pressable
            key={action}
            accessibilityHint="Previews this local auth surface."
            accessibilityLabel={formatActionLabel(action)}
            accessibilityRole="button"
            accessibilityState={{ disabled: authEntryState.isLoading, selected: selectedActionId === action }}
            disabled={authEntryState.isLoading}
            onPress={() => setSelectedActionId(action)}
            testID={`auth-entry-action-${action}`}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: productAppShell.theme.color.surface,
              backgroundColor:
                selectedActionId === action ? productAppShell.theme.color.surface : 'transparent',
              opacity: authEntryState.isLoading ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                color:
                  selectedActionId === action ? productAppShell.theme.color.primary : productAppShell.theme.color.surface,
              }}
            >
              {formatActionLabel(action)}
            </Text>
          </Pressable>
        ))}
      </View>
      <AuthActionPanel actionId={selectedActionId} authEntryState={authEntryState} />
      <Text testID="auth-entry-helper-text" style={{ marginTop: 8, color: productAppShell.theme.color.surface }}>
        {authEntryState.helperText}
      </Text>
      {authEntryState.errorMessage ? (
        <Text testID="auth-entry-error-message" style={{ marginTop: 8, color: productAppShell.theme.color.accent }}>
          Bootstrap fallback: {authEntryState.errorMessage}
        </Text>
      ) : null}
    </View>
  );
}