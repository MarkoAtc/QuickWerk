import React, { createContext, useContext, useState } from 'react';

import { runtimeConfig } from './runtime-config';

export const SessionContext = createContext({ status: 'unauthenticated' });
const localE2eSessionKey = 'quickwerk.local-e2e-session';

function readLocalE2eSession() {
  if (!runtimeConfig.localE2eAuthEnabled || typeof sessionStorage === 'undefined') return { status: 'unauthenticated' };

  try {
    const parsed = JSON.parse(sessionStorage.getItem(localE2eSessionKey) ?? '');
    return parsed?.status === 'authenticated' && parsed.sessionToken && parsed.role === 'customer' ? parsed : { status: 'unauthenticated' };
  } catch {
    return { status: 'unauthenticated' };
  }
}

export function resolveSessionToken(session) {
  if (!session || session.status !== 'authenticated') {
    return null;
  }

  return session.sessionToken ?? session.token ?? null;
}

export function SessionProvider({ children }) {
  const [session, setSessionState] = useState(readLocalE2eSession);

  function setSession(nextSession) {
    setSessionState(nextSession);
    if (!runtimeConfig.localE2eAuthEnabled || typeof sessionStorage === 'undefined') return;

    if (nextSession?.status === 'authenticated' && nextSession.sessionToken && nextSession.role === 'customer') {
      sessionStorage.setItem(localE2eSessionKey, JSON.stringify(nextSession));
    } else {
      sessionStorage.removeItem(localE2eSessionKey);
    }
  }

  function signOut() {
    const token = resolveSessionToken(session);
    setSession({ status: 'unauthenticated' });
    if (token) {
      fetch(`${runtimeConfig.platformApiBaseUrl}/api/v1/auth/sign-out`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  return (
    <SessionContext.Provider value={{ session, setSession, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
