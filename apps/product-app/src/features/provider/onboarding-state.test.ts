import { describe, expect, it } from 'vitest';

import {
  VerificationRecord,
  createApprovedState,
  createCheckingState,
  createErrorState,
  createNotSubmittedState,
  createPendingState,
  createRequestMoreInfoState,
  createRejectedState,
  createSubmittingState,
  resolveVerificationStateFromRecord,
} from './onboarding-state';

const makeRecord = (status: 'pending' | 'approved' | 'rejected' | 'request-more-info'): VerificationRecord => ({
  verificationId: 'ver-1',
  status,
  submittedAt: '2026-01-01T10:00:00.000Z',
  tradeCategories: ['plumbing'],
  documents: [],
});

describe('onboarding-state', () => {
  it('createCheckingState returns checking status', () => {
    const state = createCheckingState();
    expect(state.status).toBe('checking');
  });

  it('createNotSubmittedState returns not-submitted', () => {
    expect(createNotSubmittedState().status).toBe('not-submitted');
  });

  it('createSubmittingState stores form data', () => {
    const formData = {
      businessName: 'Acme',
      tradeCategories: ['plumbing'],
      serviceArea: 'Vienna',
      documents: [],
    };
    const state = createSubmittingState(formData);
    expect(state.status).toBe('submitting');
    if (state.status !== 'submitting') return;
    expect(state.formData.businessName).toBe('Acme');
  });

  it('createPendingState stores verification record', () => {
    const record = makeRecord('pending');
    const state = createPendingState(record);
    expect(state.status).toBe('pending');
    if (state.status !== 'pending') return;
    expect(state.verification.verificationId).toBe('ver-1');
  });

  it('createApprovedState', () => {
    const state = createApprovedState(makeRecord('approved'));
    expect(state.status).toBe('approved');
  });

  it('createRejectedState', () => {
    const state = createRejectedState(makeRecord('rejected'));
    expect(state.status).toBe('rejected');
  });

  it('createRequestMoreInfoState', () => {
    const state = createRequestMoreInfoState(makeRecord('request-more-info'));
    expect(state.status).toBe('request-more-info');
  });

  it('createErrorState stores message', () => {
    const state = createErrorState('Something went wrong');
    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Something went wrong');
  });

  describe('resolveVerificationStateFromRecord', () => {
    it('returns not-submitted for null record', () => {
      expect(resolveVerificationStateFromRecord(null).status).toBe('not-submitted');
    });

    it('returns pending for pending record', () => {
      expect(resolveVerificationStateFromRecord(makeRecord('pending')).status).toBe('pending');
    });

    it('returns approved for approved record', () => {
      expect(resolveVerificationStateFromRecord(makeRecord('approved')).status).toBe('approved');
    });

    it('returns rejected for rejected record', () => {
      expect(resolveVerificationStateFromRecord(makeRecord('rejected')).status).toBe('rejected');
    });

    it('returns request-more-info for request-more-info record', () => {
      expect(resolveVerificationStateFromRecord(makeRecord('request-more-info')).status).toBe('request-more-info');
    });
  });
});
