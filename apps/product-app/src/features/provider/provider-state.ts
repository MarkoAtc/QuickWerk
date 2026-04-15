export type BookingListItem = {
  bookingId: string;
  requestedService: string;
  status: string;
  customerUserId: string;
};

// --- Provider Profile ---

export type ProviderProfile = {
  providerUserId: string;
  displayName: string;
  bio?: string;
  tradeCategories: string[];
  serviceArea?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProviderProfileFormState = {
  displayName: string;
  bio: string;
  serviceArea: string;
  tradeCategories: string[];
  isPublic: boolean;
};

export const initialProviderProfileFormState: ProviderProfileFormState = {
  displayName: '',
  bio: '',
  serviceArea: '',
  tradeCategories: [],
  isPublic: false,
};

export type ProviderProfileScreenState =
  | { status: 'loading' }
  | { status: 'not-set'; form: ProviderProfileFormState }
  | { status: 'loaded'; profile: ProviderProfile; form: ProviderProfileFormState }
  | { status: 'saving'; form: ProviderProfileFormState }
  | { status: 'saved'; profile: ProviderProfile }
  | { status: 'error'; errorMessage: string; form: ProviderProfileFormState };

export const createLoadingProfileState = (): ProviderProfileScreenState => ({ status: 'loading' });

export const createNotSetProfileState = (form: ProviderProfileFormState = initialProviderProfileFormState): ProviderProfileScreenState => ({
  status: 'not-set',
  form,
});

export const createLoadedProfileState = (profile: ProviderProfile): ProviderProfileScreenState => ({
  status: 'loaded',
  profile,
  form: {
    displayName: profile.displayName,
    bio: profile.bio ?? '',
    serviceArea: profile.serviceArea ?? '',
    tradeCategories: [...profile.tradeCategories],
    isPublic: profile.isPublic,
  },
});

export const createSavingProfileState = (form: ProviderProfileFormState): ProviderProfileScreenState => ({
  status: 'saving',
  form,
});

export const createSavedProfileState = (profile: ProviderProfile): ProviderProfileScreenState => ({
  status: 'saved',
  profile,
});

export const createProfileErrorState = (form: ProviderProfileFormState, errorMessage: string): ProviderProfileScreenState => ({
  status: 'error',
  errorMessage,
  form,
});

export type AcceptBookingState =
  | { status: 'idle'; bookingId: string }
  | { status: 'accepting'; bookingId: string }
  | { status: 'accepted'; bookingId: string; updatedStatus: string }
  | { status: 'error'; bookingId: string; errorMessage: string };

export type DeclineBookingState =
  | { status: 'idle'; bookingId: string; declineReason: string }
  | { status: 'declining'; bookingId: string; declineReason: string }
  | { status: 'declined'; bookingId: string; updatedStatus: string; declineReason?: string }
  | { status: 'error'; bookingId: string; declineReason: string; errorMessage: string };

export type ProviderScreenState =
  | { status: 'idle'; bookingId: string; acceptState: AcceptBookingState; declineState: DeclineBookingState }
  | { status: 'error'; errorMessage: string };

export const createIdleProviderScreenState = (bookingId: string, declineReason = ''): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'idle', bookingId },
  declineState: { status: 'idle', bookingId, declineReason },
});

export const createAcceptingProviderScreenState = (bookingId: string, declineReason = ''): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'accepting', bookingId },
  declineState: { status: 'idle', bookingId, declineReason },
});

export const createAcceptedProviderScreenState = (bookingId: string, updatedStatus: string, declineReason = ''): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'accepted', bookingId, updatedStatus },
  declineState: { status: 'idle', bookingId, declineReason },
});

export const createDecliningProviderScreenState = (bookingId: string, declineReason = ''): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'idle', bookingId },
  declineState: { status: 'declining', bookingId, declineReason },
});

export const createDeclinedProviderScreenState = (bookingId: string, updatedStatus: string, declineReason?: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'idle', bookingId },
  declineState: { status: 'declined', bookingId, updatedStatus, declineReason },
});

export const createErrorProviderScreenState = (bookingId: string, errorMessage: string, declineReason = ''): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'error', bookingId, errorMessage },
  declineState: { status: 'idle', bookingId, declineReason },
});

export const createDeclineErrorProviderScreenState = (
  bookingId: string,
  declineReason: string,
  errorMessage: string,
): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'idle', bookingId },
  declineState: { status: 'error', bookingId, declineReason, errorMessage },
});
