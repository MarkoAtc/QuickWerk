export type SessionRole = 'customer' | 'provider' | 'operator';

export type AuthSession = {
  createdAt: string;
  expiresAt: string;
  email: string;
  role: SessionRole;
  token: string;
  userId: string;
};

export type RoleBasedAuthSessionInput = {
  email: string;
  role: SessionRole;
  password?: never;
};

export type PasswordAuthSessionInput = {
  email: string;
  password: string;
  role?: never;
};

export type CreateAuthSessionInput = RoleBasedAuthSessionInput | PasswordAuthSessionInput;

export type RegisterCustomerInput = {
  name: string;
  email: string;
  password: string;
};

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account with email "${email}" already exists.`);
    this.name = 'DuplicateEmailError';
  }
}

export interface AuthSessionRepository {
  createSession(input: CreateAuthSessionInput): Promise<AuthSession>;
  registerCustomer(input: RegisterCustomerInput): Promise<AuthSession>;
  resolveSession(token: string | null | undefined): Promise<AuthSession | null>;
  deleteSession(token: string | null | undefined): Promise<boolean>;
}

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');
