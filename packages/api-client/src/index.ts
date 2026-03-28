export const apiRoutes = {
  auth: '/api/v1/auth',
  providers: '/api/v1/providers',
  bookings: '/api/v1/bookings',
  payments: '/api/v1/payments',
  admin: '/api/v1/admin',
} as const;

export const providerApiRoutes = {
  submitVerification: `${apiRoutes.providers}/me/verification`,
  myVerificationStatus: `${apiRoutes.providers}/me/verification`,
  listPending: `${apiRoutes.providers}/verifications/pending`,
  getVerification: (verificationId: string) => `${apiRoutes.providers}/verifications/${verificationId}`,
  reviewVerification: (verificationId: string) => `${apiRoutes.providers}/verifications/${verificationId}/review`,
  myProfile: `${apiRoutes.providers}/me/profile`,
} as const;

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type SubmitVerificationBody = {
  businessName?: string;
  tradeCategories?: string[];
  serviceArea?: string;
  documents?: Array<{
    filename?: string;
    mimeType?: string;
    description?: string;
  }>;
};

export type ReviewVerificationBody = {
  decision: 'approved' | 'rejected';
  reviewNote?: string;
};

export const authApiRoutes = {
  session: `${apiRoutes.auth}/session`,
  signIn: `${apiRoutes.auth}/sign-in`,
  signUp: `${apiRoutes.auth}/sign-up`,
  signOut: `${apiRoutes.auth}/sign-out`,
} as const;

export const bookingApiRoutes = {
  preview: `${apiRoutes.bookings}/preview`,
  list: apiRoutes.bookings,
  get: (bookingId: string) => `${apiRoutes.bookings}/${bookingId}`,
  create: apiRoutes.bookings,
  accept: (bookingId: string) => `${apiRoutes.bookings}/${bookingId}/accept`,
  decline: (bookingId: string) => `${apiRoutes.bookings}/${bookingId}/decline`,
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

export const createGetBookingRequest = (sessionToken: string, bookingId: string) => ({
  method: 'GET',
  path: bookingApiRoutes.get(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createListBookingsRequest = (sessionToken: string) => ({
  method: 'GET',
  path: bookingApiRoutes.list,
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createAcceptBookingRequest = (sessionToken: string, bookingId: string) => ({
  method: 'POST',
  path: bookingApiRoutes.accept(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createSubmitVerificationRequest = (sessionToken: string, body: SubmitVerificationBody) => ({
  method: 'POST',
  path: providerApiRoutes.submitVerification,
  headers: { authorization: `Bearer ${sessionToken}` },
  body,
}) as const;

export const createGetMyVerificationStatusRequest = (sessionToken: string) => ({
  method: 'GET',
  path: providerApiRoutes.myVerificationStatus,
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createListPendingVerificationsRequest = (sessionToken: string) => ({
  method: 'GET',
  path: providerApiRoutes.listPending,
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createGetVerificationRequest = (sessionToken: string, verificationId: string) => ({
  method: 'GET',
  path: providerApiRoutes.getVerification(verificationId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createReviewVerificationRequest = (
  sessionToken: string,
  verificationId: string,
  body: ReviewVerificationBody,
) => ({
  method: 'POST',
  path: providerApiRoutes.reviewVerification(verificationId),
  headers: { authorization: `Bearer ${sessionToken}` },
  body,
}) as const;

export type DeclineBookingRequestBody = {
  declineReason?: string;
};

export const createDeclineBookingRequest = (
  sessionToken: string,
  bookingId: string,
  body?: DeclineBookingRequestBody,
) => ({
  method: 'POST',
  path: bookingApiRoutes.decline(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
  body: body ?? {},
}) as const;

export type UpsertProviderProfileBody = {
  displayName?: string;
  bio?: string;
  tradeCategories?: string[];
  serviceArea?: string;
  isPublic?: boolean;
};

export const createUpsertProviderProfileRequest = (sessionToken: string, body: UpsertProviderProfileBody) => ({
  method: 'PUT',
  path: providerApiRoutes.myProfile,
  headers: { authorization: `Bearer ${sessionToken}` },
  body,
}) as const;

export const createGetMyProviderProfileRequest = (sessionToken: string) => ({
  method: 'GET',
  path: providerApiRoutes.myProfile,
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;
