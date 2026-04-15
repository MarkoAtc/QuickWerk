export const apiRoutes = {
  auth: '/api/v1/auth',
  providers: '/api/v1/providers',
  bookings: '/api/v1/bookings',
  payments: '/api/v1/payments',
  admin: '/api/v1/admin',
} as const;

export const providerApiRoutes = {
  listPublicProviders: apiRoutes.providers,
  getPublicProvider: (providerUserId: string) => `${apiRoutes.providers}/${providerUserId}`,
  submitVerification: `${apiRoutes.providers}/me/verification`,
  myVerificationStatus: `${apiRoutes.providers}/me/verification`,
  listPending: `${apiRoutes.providers}/verifications/pending`,
  getVerification: (verificationId: string) => `${apiRoutes.providers}/verifications/${verificationId}`,
  reviewVerification: (verificationId: string) => `${apiRoutes.providers}/verifications/${verificationId}/review`,
  myProfile: `${apiRoutes.providers}/me/profile`,
  requestUploadUrl: `${apiRoutes.providers}/me/verification/upload-url`,
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
  complete: (bookingId: string) => `${apiRoutes.bookings}/${bookingId}/complete`,
  payment: (bookingId: string) => `${apiRoutes.bookings}/${bookingId}/payment`,
} as const;

export type SessionRole = 'customer' | 'provider';

export type SignInRequestBody = {
  email?: string;
  role?: SessionRole;
};

export type CreateBookingRequestBody = {
  requestedService?: string;
  customerLocation?: string;
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

// --- Public Provider Discovery ---

export type PublicProviderProfile = {
  providerUserId: string;
  displayName: string;
  bio?: string;
  tradeCategories: string[];
  serviceArea?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListPublicProvidersFilter = {
  tradeCategory?: string;
  location?: string;
};

/**
 * Builds a request descriptor for fetching a single public provider profile by providerUserId.
 * No authentication required — public read route.
 * Returns 404 if provider does not exist or is not public.
 */
export const createGetPublicProviderRequest = (providerUserId: string) => ({
  method: 'GET',
  path: providerApiRoutes.getPublicProvider(providerUserId),
}) as const;

/**
 * Builds a request descriptor for listing public provider profiles.
 * No authentication required — public discovery route.
 * Optionally filter by tradeCategory query parameter.
 */
export const createListPublicProvidersRequest = (filter?: ListPublicProvidersFilter) => {
  const basePath = providerApiRoutes.listPublicProviders;
  const query = new URLSearchParams();

  const normalizedTradeCategory = filter?.tradeCategory?.trim();
  const normalizedLocation = filter?.location?.trim();
  if (normalizedTradeCategory) {
    query.set('tradeCategory', normalizedTradeCategory);
  }
  if (normalizedLocation) {
    query.set('location', normalizedLocation);
  }

  const queryString = query.toString();
  const path = queryString ? `${basePath}?${queryString}` : basePath;

  return {
    method: 'GET',
    path,
  } as const;
};

// --- Booking Completion ---

export const createCompleteBookingRequest = (sessionToken: string, bookingId: string) => ({
  method: 'POST',
  path: bookingApiRoutes.complete(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createGetBookingPaymentRequest = (sessionToken: string, bookingId: string) => ({
  method: 'GET',
  path: bookingApiRoutes.payment(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

// --- Provider Upload URL ---

export type RequestUploadUrlBody = {
  filename: string;
  mimeType: string;
};

export const createRequestUploadUrlRequest = (sessionToken: string, body: RequestUploadUrlBody) => ({
  method: 'POST',
  path: providerApiRoutes.requestUploadUrl,
  headers: { authorization: `Bearer ${sessionToken}` },
  body,
}) as const;

// --- Provider Payouts ---

export const providerPayoutApiRoutes = {
  list: () => '/api/v1/providers/me/payouts',
  detail: (payoutId: string) => `/api/v1/providers/me/payouts/${payoutId}`,
} as const;

export type ListMyPayoutsQuery = {
  cursor?: string;
  limit?: number;
};

export const createGetMyPayoutsRequest = (sessionToken: string, query?: ListMyPayoutsQuery) => {
  const params = new URLSearchParams();

  if (query?.cursor?.trim()) {
    params.set('cursor', query.cursor.trim());
  }

  if (Number.isFinite(query?.limit) && (query?.limit as number) > 0) {
    params.set('limit', String(Math.floor(query?.limit as number)));
  }

  const encodedParams = params.toString();
  const path = encodedParams
    ? `${providerPayoutApiRoutes.list()}?${encodedParams}`
    : providerPayoutApiRoutes.list();

  return {
    method: 'GET',
    path,
    headers: { authorization: `Bearer ${sessionToken}` },
  } as const;
};

export const createGetPayoutDetailRequest = (sessionToken: string, payoutId: string) => ({
  method: 'GET',
  path: providerPayoutApiRoutes.detail(payoutId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

// --- Booking Invoices ---

export const bookingInvoiceApiRoutes = {
  get: (bookingId: string) => `/api/v1/bookings/${bookingId}/invoice`,
} as const;

export const createGetBookingInvoiceRequest = (sessionToken: string, bookingId: string) => ({
  method: 'GET',
  path: bookingInvoiceApiRoutes.get(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

// --- Disputes ---

export const disputeApiRoutes = {
  submit: (bookingId: string) => `/api/v1/bookings/${bookingId}/dispute`,
  pending: () => '/api/v1/disputes/pending',
  startReview: (disputeId: string) => `/api/v1/disputes/${disputeId}/start-review`,
  resolve: (disputeId: string) => `/api/v1/disputes/${disputeId}/resolve`,
  close: (disputeId: string) => `/api/v1/disputes/${disputeId}/close`,
} as const;

export const createSubmitDisputeRequest = (
  sessionToken: string,
  bookingId: string,
  body: { category: string; description: string },
) => ({
  method: 'POST' as const,
  path: disputeApiRoutes.submit(bookingId),
  headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
  body,
}) as const;

export const createGetPendingDisputesRequest = (sessionToken: string) => ({
  method: 'GET' as const,
  path: disputeApiRoutes.pending(),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createStartReviewDisputeRequest = (sessionToken: string, disputeId: string) => ({
  method: 'PATCH' as const,
  path: disputeApiRoutes.startReview(disputeId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createRouteToDisputeRequest = (sessionToken: string, disputeId: string) => ({
  method: 'PATCH' as const,
  path: disputeApiRoutes.startReview(disputeId),
  headers: { authorization: `Bearer ${sessionToken}` },
}) as const;

export const createResolveDisputeRequest = (
  sessionToken: string,
  disputeId: string,
  body: { resolutionNote?: string },
) => ({
  method: 'PATCH' as const,
  path: disputeApiRoutes.resolve(disputeId),
  headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
  body,
}) as const;

export const createCloseDisputeRequest = (
  sessionToken: string,
  disputeId: string,
  body?: { resolutionNote?: string },
) => ({
  method: 'PATCH' as const,
  path: disputeApiRoutes.close(disputeId),
  headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
  body,
}) as const;

// --- Reviews ---

export const bookingReviewApiRoutes = {
  reviews: (bookingId: string) => `/api/v1/bookings/${bookingId}/reviews`,
} as const;

export const providerReviewApiRoutes = {
  list: (providerUserId: string) => `/api/v1/providers/${providerUserId}/reviews`,
} as const;

export const createSubmitReviewRequest = (
  sessionToken: string,
  bookingId: string,
  body: { rating: number; comment?: string },
) => ({
  method: 'POST' as const,
  path: bookingReviewApiRoutes.reviews(bookingId),
  headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
  body,
});

export const createGetBookingReviewsRequest = (sessionToken: string, bookingId: string) => ({
  method: 'GET' as const,
  path: bookingReviewApiRoutes.reviews(bookingId),
  headers: { authorization: `Bearer ${sessionToken}` },
});

export const createGetProviderReviewsRequest = (providerUserId: string) => ({
  method: 'GET' as const,
  path: providerReviewApiRoutes.list(providerUserId),
  headers: {} as Record<string, string>,
});
