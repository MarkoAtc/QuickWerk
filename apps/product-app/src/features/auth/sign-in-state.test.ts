import { describe, expect, it } from 'vitest';

import {
  createErrorSignInScreenState,
  createIdleSignInScreenState,
  createSubmittingSignInScreenState,
  createSuccessSignInScreenState,
  initialSignInFormState,
} from './sign-in-state';

describe('sign-in screen state helpers', () => {
  it('returns idle state with default form when no argument given', () => {
    const state = createIdleSignInScreenState();
    expect(state).toMatchObject({ status: 'idle', form: initialSignInFormState });
  });

  it('returns submitting state with the given form', () => {
    const form = { email: 'test@example.com', role: 'customer' as const, isSubmitting: true };
    const state = createSubmittingSignInScreenState(form);
    expect(state).toMatchObject({ status: 'submitting', form });
  });

  it('returns error state with error message attached', () => {
    const form = { email: 'test@example.com', role: 'customer' as const, isSubmitting: false };
    const state = createErrorSignInScreenState(form, 'Sign-in failed with HTTP 401.');
    expect(state).toMatchObject({ status: 'error', form, errorMessage: 'Sign-in failed with HTTP 401.' });
  });

  it('returns success state with session token and role', () => {
    const state = createSuccessSignInScreenState('tok-abc123', 'provider');
    expect(state).toMatchObject({ status: 'success', sessionToken: 'tok-abc123', role: 'provider' });
  });
});
