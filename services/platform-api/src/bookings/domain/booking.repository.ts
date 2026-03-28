export type BookingStatus = 'submitted' | 'accepted';
export type BookingActorRole = 'customer' | 'provider';

export type BookingStatusEvent = {
  changedAt: string;
  from: BookingStatus | null;
  to: BookingStatus;
  actorRole: BookingActorRole;
  actorUserId: string;
};

export type BookingRecord = {
  bookingId: string;
  createdAt: string;
  customerUserId: string;
  providerUserId?: string;
  requestedService: string;
  status: BookingStatus;
  statusHistory: readonly BookingStatusEvent[];
};

export type CreateSubmittedBookingInput = {
  createdAt: string;
  customerUserId: string;
  requestedService: string;
  actorRole: BookingActorRole;
  actorUserId: string;
};

export type AcceptSubmittedBookingInput = {
  bookingId: string;
  acceptedAt: string;
  providerUserId: string;
  actorRole: BookingActorRole;
  actorUserId: string;
};

export type AcceptSubmittedBookingResult =
  | { ok: true; booking: BookingRecord; replayed: boolean }
  | {
      ok: false;
      reason: 'not-found' | 'transition-conflict';
      currentStatus?: BookingStatus;
      currentProviderUserId?: string;
    };

export type BookingSummary = {
  bookingId: string;
  status: BookingStatus;
  requestedService: string;
  createdAt: string;
  customerUserId: string;
};

export type ListBookingsFilter =
  | { scope: 'submitted-only' }
  | { scope: 'customer-owned'; customerUserId: string };

export interface BookingRepository {
  createSubmittedBooking(input: CreateSubmittedBookingInput): Promise<BookingRecord>;
  acceptSubmittedBooking(input: AcceptSubmittedBookingInput): Promise<AcceptSubmittedBookingResult>;
  listBookings(filter: ListBookingsFilter): Promise<BookingSummary[]>;
  getBooking(bookingId: string): Promise<BookingRecord | null>;
}

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
