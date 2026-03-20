export const apiRoutes = {
  auth: '/api/v1/auth',
  providers: '/api/v1/providers',
  bookings: '/api/v1/bookings',
  payments: '/api/v1/payments',
  admin: '/api/v1/admin',
} as const;

export const authApiRoutes = {
  session: `${apiRoutes.auth}/session`,
  signIn: `${apiRoutes.auth}/sign-in`,
  signUp: `${apiRoutes.auth}/sign-up`,
  signOut: `${apiRoutes.auth}/sign-out`,
} as const;

export const bookingApiRoutes = {
  preview: `${apiRoutes.bookings}/preview`,
  create: apiRoutes.bookings,
  accept: (bookingId: string) => `${apiRoutes.bookings}/${bookingId}/accept`,
} as const;

export type SessionRole = 'customer' | 'provider';

export type SignInRequestBody = {
  email?: string;
  role?: SessionRole;
};

export type CreateBookingRequestBody = {
  requestedService?: string;
};

export const createSessionBootstrapRequest = (sessionToken?: string) => ({
  method: 'GET',
  path: authApiRoutes.session,
  headers: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined,
}) as const;

export const createSignInRequest = (body: SignInRequestBody) => ({
  method: 'POST',
  path: authApiRoutes.signIn,
  body,
}) as const;

export const createSignOutRequest = (sessionToken: string) => ({
  method: 'POST',
  path: authApiRoutes.signOut,
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createMarketplacePreviewRequest = () => ({
  method: 'GET',
  path: bookingApiRoutes.preview,
}) as const;

export const createBookingRequest = (sessionToken: string, body: CreateBookingRequestBody) => ({
  method: 'POST',
  path: bookingApiRoutes.create,
  headers: { authorization: `Bearer ${sessionToken}` },
  body,
}) as const;

export const createAcceptBookingRequest = (sessionToken: string, bookingId: string) => ({
  method: 'POST',
  path: bookingApiRoutes.accept(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;
