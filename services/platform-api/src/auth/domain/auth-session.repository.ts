export type SessionRole = 'customer' | 'provider';

export type AuthSession = {
  createdAt: string;
  email: string;
  role: SessionRole;
  token: string;
  userId: string;
};

export type CreateAuthSessionInput = {
  email: string;
  role: SessionRole;
};

export interface AuthSessionRepository {
  createSession(input: CreateAuthSessionInput): AuthSession;
  resolveSession(token: string | null | undefined): AuthSession | null;
  deleteSession(token: string | null | undefined): boolean;
}

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');
