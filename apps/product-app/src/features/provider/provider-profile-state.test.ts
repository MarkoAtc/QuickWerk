import { describe, expect, it } from 'vitest';

import {
  createLoadedProfileState,
  createLoadingProfileState,
  createNotSetProfileState,
  createProfileErrorState,
  createSavedProfileState,
  createSavingProfileState,
  initialProviderProfileFormState,
  ProviderProfile,
} from './provider-state';

const sampleProfile: ProviderProfile = {
  providerUserId: 'provider-1',
  displayName: 'Max Muster',
  bio: 'Expert plumber',
  tradeCategories: ['plumbing'],
  serviceArea: 'Vienna',
  isPublic: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T12:00:00.000Z',
};

describe('ProviderProfileScreenState factories', () => {
  it('createLoadingProfileState creates loading state', () => {
    const state = createLoadingProfileState();
    expect(state.status).toBe('loading');
  });

  it('createNotSetProfileState creates not-set with default form', () => {
    const state = createNotSetProfileState();
    expect(state.status).toBe('not-set');
    if (state.status === 'not-set') {
      expect(state.form).toEqual(initialProviderProfileFormState);
    }
  });

  it('createLoadedProfileState populates form from profile', () => {
    const state = createLoadedProfileState(sampleProfile);
    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.profile.displayName).toBe('Max Muster');
      expect(state.form.displayName).toBe('Max Muster');
      expect(state.form.bio).toBe('Expert plumber');
      expect(state.form.tradeCategories).toEqual(['plumbing']);
      expect(state.form.isPublic).toBe(true);
    }
  });

  it('createSavingProfileState creates saving state with form', () => {
    const form = { ...initialProviderProfileFormState, displayName: 'Test' };
    const state = createSavingProfileState(form);
    expect(state.status).toBe('saving');
    if (state.status === 'saving') {
      expect(state.form.displayName).toBe('Test');
    }
  });

  it('createSavedProfileState creates saved state with profile', () => {
    const state = createSavedProfileState(sampleProfile);
    expect(state.status).toBe('saved');
    if (state.status === 'saved') {
      expect(state.profile.providerUserId).toBe('provider-1');
    }
  });

  it('createProfileErrorState carries error message and form', () => {
    const form = { ...initialProviderProfileFormState, displayName: 'Hans' };
    const state = createProfileErrorState(form, 'Save failed');
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.errorMessage).toBe('Save failed');
      expect(state.form.displayName).toBe('Hans');
    }
  });
});
