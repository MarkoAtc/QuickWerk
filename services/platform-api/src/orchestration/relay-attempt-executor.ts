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

@Injectable()
export class QueueBackedRelayAttemptExecutor implements RelayAttemptExecutor {
  private readonly queue: RelayAttemptExecutionInput[] = [];

  execute(input: RelayAttemptExecutionInput): RelayAttemptExecutionResult {
    this.queue.push(input);

    const queuedAttempt = this.queue.shift();

    if (!queuedAttempt) {
      throw new Error('QueueBackedRelayAttemptExecutor queue underflow.');
    }

    return consumeBookingAcceptedAttempt(queuedAttempt);
  }
}
