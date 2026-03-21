import type { SessionRole } from '@quickwerk/api-client';

export type AppSession =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; sessionToken: string; role: SessionRole };

export const unauthenticatedSession: AppSession = { status: 'unauthenticated' };

export const createAuthenticatedSession = (sessionToken: string, role: SessionRole): AppSession => ({
  status: 'authenticated',
  sessionToken,
  role,
});

let _currentSession: AppSession = unauthenticatedSession;

export const sessionStore = {
  get(): AppSession {
    return _currentSession;
  },
  set(session: AppSession): void {
    _currentSession = session;
  },
  clear(): void {
    _currentSession = unauthenticatedSession;
  },
};
