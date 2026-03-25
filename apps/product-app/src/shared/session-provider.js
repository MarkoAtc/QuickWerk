import React, { createContext, useContext, useState } from 'react';

import { runtimeConfig } from './runtime-config';

export const SessionContext = createContext({ status: 'unauthenticated' });

export function SessionProvider({ children }) {
  const [session, setSession] = useState({ status: 'unauthenticated' });

  function signOut() {
    const token = session.status === 'authenticated' ? session.token : null;
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
