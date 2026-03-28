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

export type ProviderScreenState =
  | { status: 'idle'; bookingId: string; acceptState: AcceptBookingState }
  | { status: 'error'; errorMessage: string };

export const createIdleProviderScreenState = (bookingId: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'idle', bookingId },
});

export const createAcceptingProviderScreenState = (bookingId: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'accepting', bookingId },
});

export const createAcceptedProviderScreenState = (bookingId: string, updatedStatus: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'accepted', bookingId, updatedStatus },
});

export const createErrorProviderScreenState = (bookingId: string, errorMessage: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'error', bookingId, errorMessage },
});
