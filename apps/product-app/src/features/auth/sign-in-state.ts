import type { SessionRole } from '@quickwerk/api-client';

export type SignInFormState = {
  email: string;
  role: SessionRole;
  isSubmitting: boolean;
  errorMessage?: string;
};

export const initialSignInFormState: SignInFormState = {
  email: '',
  role: 'customer',
  isSubmitting: false,
};

export type SignInScreenState =
  | { status: 'idle'; form: SignInFormState }
  | { status: 'submitting'; form: SignInFormState }
  | { status: 'error'; form: SignInFormState; errorMessage: string }
  | { status: 'success'; sessionToken: string; role: SessionRole };

export const createIdleSignInScreenState = (form: SignInFormState = initialSignInFormState): SignInScreenState => ({
  status: 'idle',
  form,
});

export const createSubmittingSignInScreenState = (form: SignInFormState): SignInScreenState => ({
  status: 'submitting',
  form,
});

export const createErrorSignInScreenState = (form: SignInFormState, errorMessage: string): SignInScreenState => ({
  status: 'error',
  form,
  errorMessage,
});

export const createSuccessSignInScreenState = (
  sessionToken: string,
  role: SessionRole,
): SignInScreenState => ({
  status: 'success',
  sessionToken,
  role,
});
