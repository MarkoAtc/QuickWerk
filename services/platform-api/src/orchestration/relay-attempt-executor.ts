import { consumeBookingAcceptedAttempt } from '@quickwerk/background-workers';
import { Injectable } from '@nestjs/common';

export const BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR = Symbol('BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR');

export type RelayAttemptExecutionInput = Parameters<typeof consumeBookingAcceptedAttempt>[0];
export type RelayAttemptExecutionResult = ReturnType<typeof consumeBookingAcceptedAttempt>;

export interface RelayAttemptExecutor {
  execute(input: RelayAttemptExecutionInput): RelayAttemptExecutionResult;
}

@Injectable()
export class InMemoryRelayAttemptExecutor implements RelayAttemptExecutor {
  execute(input: RelayAttemptExecutionInput): RelayAttemptExecutionResult {
    return consumeBookingAcceptedAttempt(input);
  }
}
