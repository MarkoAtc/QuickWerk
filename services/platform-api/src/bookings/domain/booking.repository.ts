import { AuthSession } from '../../auth/domain/auth-session.repository';

export type BookingStatus = 'submitted' | 'accepted';

export type BookingStatusEvent = {
  changedAt: string;
  from: BookingStatus | null;
  to: BookingStatus;
  actorRole: AuthSession['role'];
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
  actorRole: AuthSession['role'];
  actorUserId: string;
};

export type AcceptSubmittedBookingInput = {
  bookingId: string;
  acceptedAt: string;
  providerUserId: string;
  actorRole: AuthSession['role'];
  actorUserId: string;
};

export type AcceptSubmittedBookingResult =
  | { ok: true; booking: BookingRecord }
  | { ok: false; reason: 'not-found' | 'transition-conflict'; currentStatus?: BookingStatus };

export interface BookingRepository {
  createSubmittedBooking(input: CreateSubmittedBookingInput): Promise<BookingRecord>;
  acceptSubmittedBooking(input: AcceptSubmittedBookingInput): Promise<AcceptSubmittedBookingResult>;
}

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
