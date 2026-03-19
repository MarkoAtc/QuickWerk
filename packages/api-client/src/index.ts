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

export const marketplaceApiRoutes = {
  preview: `${apiRoutes.bookings}/preview`,
} as const;

export const createSessionBootstrapRequest = () => ({
  method: 'GET',
  path: authApiRoutes.session,
}) as const;

export const createMarketplacePreviewRequest = () => ({
  method: 'GET',
  path: marketplaceApiRoutes.preview,
}) as const;
