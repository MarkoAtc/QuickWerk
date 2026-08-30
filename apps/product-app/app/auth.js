import { useState } from 'react';

import { useRouter } from 'expo-router';

import { OtpVerifyScreen } from '../src/features/auth/otp-verify-screen';
import { PhoneEntryScreen } from '../src/features/auth/phone-entry-screen';
import { createLocalBrowserTestSession, requestOtp, verifyOtp } from '../src/features/auth/auth-otp-actions';
import { runtimeConfig } from '../src/shared/runtime-config';
import { useSession } from '../src/shared/session-provider';

export default function ProductAuthScreen() {
  const router = useRouter();
  const { setSession } = useSession();
  const [step, setStep] = useState('phone-entry');
  const [phone, setPhone] = useState('');
  const [devOtpCode, setDevOtpCode] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const handleSendCode = async ({ phone: enteredPhone }) => {
    if (isSending) return;
    setIsSending(true);
    setError(null);

    try {
      const result = await requestOtp({ phone: enteredPhone });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setPhone(enteredPhone);
      setDevOtpCode(result.devOtpCode ?? null);
      setStep('otp-verify');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async ({ code }) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyOtp({ phone, code });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSession({
        status: 'authenticated',
        sessionToken: result.sessionToken,
        role: result.role,
      });

      router.replace(result.role === 'provider' ? '/provider' : '/home-triage');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLocalBrowserSignIn = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      const result = await createLocalBrowserTestSession();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSession({ status: 'authenticated', sessionToken: result.sessionToken, role: result.role });
      router.replace('/home-triage');
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === 'otp-verify') {
    return (
      <OtpVerifyScreen
        devOtpCode={devOtpCode}
        error={error}
        isVerifying={isVerifying}
        onBack={() => {
          setError(null);
          setDevOtpCode(null);
          setStep('phone-entry');
        }}
        onResend={() => handleSendCode({ phone })}
        onVerify={handleVerify}
        phone={phone}
      />
    );
  }

  return (
    <PhoneEntryScreen
      error={error}
      isSending={isSending}
      onSendCode={handleSendCode}
      onUseProviderSignIn={() => router.push('/auth-provider')}
      onLocalBrowserSignIn={runtimeConfig.localE2eAuthEnabled ? handleLocalBrowserSignIn : undefined}
    />
  );
}
