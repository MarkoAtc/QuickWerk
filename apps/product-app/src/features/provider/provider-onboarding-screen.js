import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import {
  loadMyProviderProfile,
  requestVerificationUploadUrl,
  saveMyProviderProfile,
} from './provider-screen-actions';
import { loadOnboardingStatus, submitOnboarding } from './onboarding-screen-actions';
import { resolveProviderOnboardingWorkspaceFlow } from './provider-onboarding-workspace-state';
import { productAppShell } from '../../shared/app-shell';
import { ProductScreenShell } from '../../shared/product-screen-shell';
import { resolveSessionToken, useSession } from '../../shared/session-provider';

const emptyProfileForm = {
  displayName: '',
  bio: '',
  serviceArea: '',
  tradeCategoriesInput: '',
  isPublic: false,
};

const emptyVerificationForm = {
  businessName: '',
  tradeCategoriesInput: '',
  serviceArea: '',
  documentFilename: '',
  documentMimeType: 'application/pdf',
  documentDescription: '',
};

function parseTradeCategories(input) {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function ProviderOnboardingScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();

  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);

  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profileWorkspaceState, setProfileWorkspaceState] = useState('loading');
  const [profileError, setProfileError] = useState(undefined);
  const [profileSavedMessage, setProfileSavedMessage] = useState(undefined);

  const [verificationState, setVerificationState] = useState({ status: 'checking' });
  const [verificationForm, setVerificationForm] = useState(emptyVerificationForm);
  const [verificationError, setVerificationError] = useState(undefined);
  const [verificationMessage, setVerificationMessage] = useState(undefined);
  const [preparedDocuments, setPreparedDocuments] = useState([]);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      router.replace('/auth');
      return;
    }

    if (session.role !== 'provider') {
      router.replace('/');
    }
  }, [router, session.role, session.status]);

  const sessionToken = useMemo(() => resolveSessionToken(session), [session]);

  const ensureProviderToken = () => {
    if (session.status !== 'authenticated' || !sessionToken || session.role !== 'provider') {
      signOut();
      router.replace('/auth');
      return null;
    }

    return sessionToken;
  };

  const loadWorkspace = () => {
    const token = ensureProviderToken();
    if (!token) {
      return;
    }

    setIsRefreshing(true);
    setProfileWorkspaceState('loading');
    setProfileError(undefined);
    setVerificationError(undefined);
    setVerificationMessage(undefined);
    setProfileSavedMessage(undefined);

    Promise.all([loadMyProviderProfile(token), loadOnboardingStatus(token)])
      .then(([profileResult, onboardingResult]) => {
        if (profileResult.errorMessage) {
          setProfileWorkspaceState('error');
          setProfileError(profileResult.errorMessage);
        } else if (profileResult.profile) {
          const profile = profileResult.profile;
          setProfileWorkspaceState('ready');
          setProfileForm({
            displayName: profile.displayName,
            bio: profile.bio ?? '',
            serviceArea: profile.serviceArea ?? '',
            tradeCategoriesInput: profile.tradeCategories.join(', '),
            isPublic: profile.isPublic,
          });
          setVerificationForm((previous) => ({
            ...previous,
            businessName: previous.businessName || profile.displayName,
            serviceArea: previous.serviceArea || (profile.serviceArea ?? ''),
            tradeCategoriesInput: previous.tradeCategoriesInput || profile.tradeCategories.join(', '),
          }));
        } else {
          setProfileWorkspaceState('not-set');
          setProfileForm(emptyProfileForm);
        }

        setVerificationState(onboardingResult);

        if (onboardingResult.status === 'error') {
          setVerificationError(onboardingResult.errorMessage);
          return;
        }

        if (
          onboardingResult.status === 'pending'
          || onboardingResult.status === 'approved'
          || onboardingResult.status === 'request-more-info'
          || onboardingResult.status === 'rejected'
        ) {
          const record = onboardingResult.verification;
          setPreparedDocuments(
            record.documents.map((document) => ({
              documentId: document.documentId,
              filename: document.filename,
              mimeType: document.mimeType,
              description: document.description ?? '',
              uploadedAt: document.uploadedAt,
              source: 'record',
            })),
          );
          setVerificationForm((previous) => ({
            ...previous,
            businessName: record.businessName ?? previous.businessName,
            serviceArea: record.serviceArea ?? previous.serviceArea,
            tradeCategoriesInput:
              record.tradeCategories.length > 0
                ? record.tradeCategories.join(', ')
                : previous.tradeCategoriesInput,
          }));
        } else {
          setPreparedDocuments([]);
        }
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    if (session.status !== 'authenticated' || session.role !== 'provider') {
      return;
    }
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.role, sessionToken]);

  if (session.status !== 'authenticated' || session.role !== 'provider') {
    return null;
  }

  const handleSaveProfile = () => {
    const token = ensureProviderToken();
    if (!token) {
      return;
    }

    setIsSavingProfile(true);
    setProfileWorkspaceState('saving');
    setProfileError(undefined);
    setProfileSavedMessage(undefined);

    saveMyProviderProfile(token, {
      displayName: profileForm.displayName.trim(),
      bio: profileForm.bio.trim() || undefined,
      serviceArea: profileForm.serviceArea.trim() || undefined,
      tradeCategories: parseTradeCategories(profileForm.tradeCategoriesInput),
      isPublic: profileForm.isPublic,
    })
      .then((result) => {
        if (result.errorMessage) {
          setProfileWorkspaceState('error');
          setProfileError(result.errorMessage);
          return;
        }

        setProfileSavedMessage('Profile saved.');
        setProfileWorkspaceState('saved');
        if (result.profile) {
          setProfileForm({
            displayName: result.profile.displayName,
            bio: result.profile.bio ?? '',
            serviceArea: result.profile.serviceArea ?? '',
            tradeCategoriesInput: result.profile.tradeCategories.join(', '),
            isPublic: result.profile.isPublic,
          });
        }
      })
      .finally(() => {
        setIsSavingProfile(false);
      });
  };

  const handlePrepareUpload = () => {
    const token = ensureProviderToken();
    if (!token) {
      return;
    }

    const filename = verificationForm.documentFilename.trim();
    const mimeType = verificationForm.documentMimeType.trim();

    if (!filename || !mimeType) {
      setVerificationError('Document filename and mime type are required.');
      return;
    }

    setIsPreparingUpload(true);
    setVerificationError(undefined);
    setVerificationMessage(undefined);

    requestVerificationUploadUrl(token, { filename, mimeType })
      .then((result) => {
        if (result.errorMessage) {
          setVerificationError(result.errorMessage);
          return;
        }

        const nextDocument = {
          documentId: result.uploadUrl.uploadId,
          filename: result.uploadUrl.filename || filename,
          mimeType: result.uploadUrl.mimeType || mimeType,
          description: verificationForm.documentDescription.trim(),
          uploadedAt: new Date().toISOString(),
          expiresAt: result.uploadUrl.expiresAt,
          source: 'upload-url',
        };

        setPreparedDocuments((previous) => {
          const filtered = previous.filter((item) => item.filename !== nextDocument.filename);
          return [...filtered, nextDocument];
        });
        setVerificationMessage(`Upload URL prepared for ${nextDocument.filename}.`);
      })
      .finally(() => {
        setIsPreparingUpload(false);
      });
  };

  const handleSubmitVerification = () => {
    const token = ensureProviderToken();
    if (!token) {
      return;
    }

    setIsSubmittingVerification(true);
    setVerificationError(undefined);
    setVerificationMessage(undefined);

    submitOnboarding(token, {
      businessName: verificationForm.businessName.trim(),
      tradeCategories: parseTradeCategories(verificationForm.tradeCategoriesInput),
      serviceArea: verificationForm.serviceArea.trim(),
      documents: preparedDocuments.map((document) => ({
        filename: document.filename,
        mimeType: document.mimeType,
        description: document.description || undefined,
      })),
    })
      .then((state) => {
        setVerificationState(state);
        if (state.status === 'error') {
          setVerificationError(state.errorMessage);
          return;
        }
        setVerificationMessage('Verification submission sent.');
      })
      .finally(() => {
        setIsSubmittingVerification(false);
      });
  };

  const canSubmitVerification = !isSubmittingVerification
    && !isPreparingUpload
    && verificationForm.businessName.trim().length > 0
    && parseTradeCategories(verificationForm.tradeCategoriesInput).length > 0
    && verificationForm.serviceArea.trim().length > 0
    && preparedDocuments.length > 0;

  const workspaceFlow = resolveProviderOnboardingWorkspaceFlow({
    profileState: profileWorkspaceState,
    onboardingState: verificationState,
  });

  return (
    <ProductScreenShell
      title="Provider onboarding workspace"
      subtitle="Complete and maintain your business profile, service area, and verification handoff in one place."
      testID="provider-onboarding-screen"
    >
      <View style={{ gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to provider bookings"
          onPress={() => router.push('/provider')}
          testID="provider-onboarding-back"
          style={{
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '600' }}>Back to provider home</Text>
        </Pressable>

        {isRefreshing ? <Text style={{ color: '#64748B' }}>Loading onboarding workspace…</Text> : null}
        <Text style={{ color: '#475569' }}>Current flow: {workspaceFlow}</Text>
      </View>

      <View
        style={{
          marginTop: 14,
          borderWidth: 1,
          borderColor: '#D7DFEA',
          borderRadius: 12,
          padding: 14,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '700', fontSize: 16 }}>
          Business profile
        </Text>
        <Text style={{ marginTop: 6, color: '#475569' }}>
          Keep provider card details and service coverage current for discovery and onboarding review.
        </Text>

        {profileError ? <Text style={{ marginTop: 8, color: '#B91C1C' }}>{profileError}</Text> : null}
        {profileSavedMessage ? <Text style={{ marginTop: 8, color: '#166534' }}>{profileSavedMessage}</Text> : null}

        <TextInput
          value={profileForm.displayName}
          onChangeText={(value) => setProfileForm((previous) => ({ ...previous, displayName: value }))}
          placeholder="Business display name"
          testID="provider-profile-display-name"
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        />

        <TextInput
          value={profileForm.bio}
          onChangeText={(value) => setProfileForm((previous) => ({ ...previous, bio: value }))}
          placeholder="Business bio"
          multiline
          testID="provider-profile-bio"
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            minHeight: 72,
            textAlignVertical: 'top',
          }}
        />

        <TextInput
          value={profileForm.serviceArea}
          onChangeText={(value) => setProfileForm((previous) => ({ ...previous, serviceArea: value }))}
          placeholder="Service area (city/region)"
          testID="provider-profile-service-area"
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        />

        <TextInput
          value={profileForm.tradeCategoriesInput}
          onChangeText={(value) => setProfileForm((previous) => ({ ...previous, tradeCategoriesInput: value }))}
          placeholder="Trades (comma-separated)"
          testID="provider-profile-trades"
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        />

        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#334155', fontWeight: '600' }}>Public in provider discovery</Text>
          <Switch
            value={profileForm.isPublic}
            onValueChange={(value) => setProfileForm((previous) => ({ ...previous, isPublic: value }))}
            testID="provider-profile-is-public"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save provider profile"
          onPress={handleSaveProfile}
          testID="provider-profile-save"
          disabled={isSavingProfile}
          style={{
            marginTop: 12,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: isSavingProfile ? '#94A3B8' : productAppShell.theme.color.primary,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            {isSavingProfile ? 'Saving profile…' : 'Save profile'}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          marginTop: 14,
          borderWidth: 1,
          borderColor: '#D7DFEA',
          borderRadius: 12,
          padding: 14,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text style={{ color: productAppShell.theme.color.primary, fontWeight: '700', fontSize: 16 }}>
          Verification handoff
        </Text>

        <Text style={{ marginTop: 6, color: '#475569' }}>
          Status:{' '}
          {verificationState.status === 'checking'
            ? 'Checking'
            : verificationState.status === 'not-submitted'
              ? 'Not submitted'
              : verificationState.status === 'pending'
                ? 'Pending review'
                : verificationState.status === 'approved'
                  ? 'Approved'
                  : verificationState.status === 'request-more-info'
                    ? 'More info requested (update and resubmit)'
                  : verificationState.status === 'rejected'
                    ? 'Rejected (retry available)'
                    : 'Error'}
        </Text>

        {(verificationState.status === 'pending'
          || verificationState.status === 'approved'
          || verificationState.status === 'request-more-info'
          || verificationState.status === 'rejected') ? (
            <View
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 8,
                padding: 10,
                backgroundColor: '#F8FAFC',
              }}
            >
              <Text style={{ color: '#334155' }}>
                Last submission: {verificationState.verification.submittedAt}
              </Text>
              {verificationState.verification.reviewNote ? (
                <Text style={{ marginTop: 4, color: '#7F1D1D' }}>
                  Review note: {verificationState.verification.reviewNote}
                </Text>
              ) : null}
            </View>
          ) : null}

        {verificationError ? <Text style={{ marginTop: 8, color: '#B91C1C' }}>{verificationError}</Text> : null}
        {verificationMessage ? <Text style={{ marginTop: 8, color: '#166534' }}>{verificationMessage}</Text> : null}

        {(verificationState.status === 'not-submitted'
          || verificationState.status === 'request-more-info'
          || verificationState.status === 'rejected') ? (
          <>
            <TextInput
              value={verificationForm.businessName}
              onChangeText={(value) => setVerificationForm((previous) => ({ ...previous, businessName: value }))}
              placeholder="Legal/business name"
              testID="provider-verification-business-name"
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />
            <TextInput
              value={verificationForm.tradeCategoriesInput}
              onChangeText={(value) => setVerificationForm((previous) => ({ ...previous, tradeCategoriesInput: value }))}
              placeholder="Trades for verification (comma-separated)"
              testID="provider-verification-trades"
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />
            <TextInput
              value={verificationForm.serviceArea}
              onChangeText={(value) => setVerificationForm((previous) => ({ ...previous, serviceArea: value }))}
              placeholder="Service area for verification"
              testID="provider-verification-service-area"
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />

            <Text style={{ marginTop: 12, color: '#334155', fontWeight: '600' }}>Verification document metadata</Text>
            <TextInput
              value={verificationForm.documentFilename}
              onChangeText={(value) => setVerificationForm((previous) => ({ ...previous, documentFilename: value }))}
              placeholder="Filename (e.g. business-license.pdf)"
              testID="provider-verification-document-filename"
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />
            <TextInput
              value={verificationForm.documentMimeType}
              onChangeText={(value) => setVerificationForm((previous) => ({ ...previous, documentMimeType: value }))}
              placeholder="Mime type"
              testID="provider-verification-document-mime"
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />
            <TextInput
              value={verificationForm.documentDescription}
              onChangeText={(value) => setVerificationForm((previous) => ({ ...previous, documentDescription: value }))}
              placeholder="Description (optional)"
              testID="provider-verification-document-description"
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Prepare verification upload url"
              onPress={handlePrepareUpload}
              disabled={isPreparingUpload}
              testID="provider-verification-prepare-upload"
              style={{
                marginTop: 12,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: '#0284C7',
                backgroundColor: isPreparingUpload ? '#E2E8F0' : '#E0F2FE',
              }}
            >
              <Text style={{ color: '#075985', fontWeight: '700' }}>
                {isPreparingUpload ? 'Preparing upload URL…' : 'Prepare upload URL'}
              </Text>
            </Pressable>

            <View style={{ marginTop: 10, gap: 6 }} testID="provider-verification-documents">
              {preparedDocuments.map((document) => (
                <Text key={`${document.filename}-${document.documentId}`} style={{ color: '#334155' }}>
                  {document.filename} ({document.mimeType}) [{document.source}]
                </Text>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit verification handoff"
              onPress={handleSubmitVerification}
              disabled={!canSubmitVerification}
              testID="provider-verification-submit"
              style={{
                marginTop: 12,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: canSubmitVerification ? productAppShell.theme.color.primary : '#94A3B8',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                {isSubmittingVerification ? 'Submitting verification…' : 'Submit verification'}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </ProductScreenShell>
  );
}
