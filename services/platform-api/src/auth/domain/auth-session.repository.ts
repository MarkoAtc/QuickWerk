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

export type RequestOtpResult = {
  expiresAt: string;
  devCode?: string;
};

export type VerifyOtpInput = {
  phone: string;
  code: string;
  role?: SessionRole;
};

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account with email "${email}" already exists.`);
    this.name = 'DuplicateEmailError';
  }
}

export class InvalidOtpError extends Error {
  constructor(phone: string) {
    super(`Invalid or already-used verification code for phone "${phone}".`);
    this.name = 'InvalidOtpError';
  }
}

export class OtpExpiredError extends Error {
  constructor(phone: string) {
    super(`Verification code for phone "${phone}" has expired.`);
    this.name = 'OtpExpiredError';
  }
}

export class OtpRequestCooldownError extends Error {
  constructor(phone: string) {
    super(`A verification code was already requested for phone "${phone}" recently.`);
    this.name = 'OtpRequestCooldownError';
  }
}

export interface AuthSessionRepository {
  createSession(input: CreateAuthSessionInput): Promise<AuthSession>;
  registerCustomer(input: RegisterCustomerInput): Promise<AuthSession>;
  resolveSession(token: string | null | undefined): Promise<AuthSession | null>;
  deleteSession(token: string | null | undefined): Promise<boolean>;
  requestOtp(phone: string): Promise<RequestOtpResult>;
  verifyOtp(input: VerifyOtpInput): Promise<AuthSession>;
}

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');
