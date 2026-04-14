import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { BookingCompletionScreen } from '../src/features/booking/booking-completion-screen';
import {
  resolveBookingCompletionRouteState,
  resolveCompletionBookingIdParam,
} from '../src/features/booking/booking-completion-route-state';
import {
  submitBookingCompletionDispute,
  submitBookingCompletionReview,
} from '../src/features/booking/booking-completion-screen-actions';
import { productAppShell } from '../src/shared/app-shell';
import { ProductScreenShell } from '../src/shared/product-screen-shell';
import { resolveSessionToken, useSession } from '../src/shared/session-provider';

const initialReviewState = { status: 'idle' };
const initialDisputeState = { status: 'idle' };

export default function BookingCompletionRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session, signOut } = useSession();
  const [screenState, setScreenState] = useState({ status: 'loading' });

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewState, setReviewState] = useState(initialReviewState);

  const [disputeCategory, setDisputeCategory] = useState('quality');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeState, setDisputeState] = useState(initialDisputeState);

  const bookingId = resolveCompletionBookingIdParam(params.bookingId);

  const load = useCallback(() => {
    if (session.status !== 'authenticated') {
      return;
    }

    const sessionToken = resolveSessionToken(session);

    if (!sessionToken) {
      signOut();
      router.replace('/auth');
      return;
    }

    setScreenState({ status: 'loading' });

    resolveBookingCompletionRouteState({
      sessionToken,
      bookingId,
    }).then(setScreenState);
  }, [bookingId, router, session, signOut]);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      router.replace('/auth');
      return;
    }

    load();
  }, [load, router, session.status]);

  if (session.status !== 'authenticated') {
    return null;
  }

  const sessionToken = resolveSessionToken(session);

  if (!sessionToken) {
    signOut();
    router.replace('/auth');
    return null;
  }

  const handleSubmitReview = () => {
    if (reviewState.status === 'submitting') {
      return;
    }

    if (!bookingId) {
      setReviewState({ status: 'error', message: 'Missing booking id in route params.' });
      return;
    }

    setReviewState({ status: 'submitting' });

    submitBookingCompletionReview({
      sessionToken,
      bookingId,
      rating: reviewRating,
      comment: reviewComment.trim() ? reviewComment.trim() : undefined,
    }).then((result) => {
      if (result.errorMessage) {
        setReviewState({ status: 'error', message: result.errorMessage });
        return;
      }

      setReviewState({ status: 'submitted', reviewId: result.review.reviewId });
      load();
    });
  };

  const handleOpenDispute = () => {
    if (disputeState.status === 'submitting') {
      return;
    }

    if (!bookingId) {
      setDisputeState({ status: 'error', message: 'Missing booking id in route params.' });
      return;
    }

    if (!disputeDescription.trim()) {
      setDisputeState({ status: 'error', message: 'Please describe the dispute before submitting.' });
      return;
    }

    setDisputeState({ status: 'submitting' });

    submitBookingCompletionDispute({
      sessionToken,
      bookingId,
      category: disputeCategory,
      description: disputeDescription.trim(),
    }).then((result) => {
      if (result.errorMessage) {
        setDisputeState({ status: 'error', message: result.errorMessage });
        return;
      }

      setDisputeState({ status: 'submitted', disputeId: result.dispute.disputeId, disputeStatus: result.dispute.status });
      load();
    });
  };

  if (screenState.status === 'loading') {
    return (
      <ProductScreenShell
        title="Booking completion"
        subtitle="Loading completion details."
        testID="booking-completion-loading"
      >
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator color={productAppShell.theme.color.primary} size="small" />
          <Text style={{ marginTop: 8, color: '#64748B' }}>Loading completion details…</Text>
        </View>
      </ProductScreenShell>
    );
  }

  if (screenState.status === 'error') {
    return (
      <ProductScreenShell
        title="Booking completion"
        subtitle="Could not load completion details."
        testID="booking-completion-error"
      >
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 }}>
          <Text style={{ color: '#B91C1C' }}>{screenState.errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry completion details"
            onPress={load}
            testID="booking-completion-retry"
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      </ProductScreenShell>
    );
  }

  if (screenState.status === 'empty') {
    return (
      <ProductScreenShell
        title="Booking completion"
        subtitle="Completion state is not available yet."
        testID="booking-completion-empty"
      >
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1 }}>
          <Text style={{ color: '#1D4ED8', fontWeight: '600' }}>{screenState.message}</Text>
          <Text style={{ color: '#1E40AF', marginTop: 8 }}>Current booking status: {screenState.bookingStatus}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open active booking status"
            onPress={() => router.replace({ pathname: '/active-job', params: { bookingId } })}
            testID="booking-completion-open-active-job"
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>Open active booking screen</Text>
          </Pressable>
        </View>
      </ProductScreenShell>
    );
  }

  const reviewFeedback =
    reviewState.status === 'error'
      ? reviewState.message
      : reviewState.status === 'submitted'
        ? `Review submitted (${reviewState.reviewId}).`
        : reviewState.status === 'submitting'
          ? 'Submitting review…'
          : undefined;

  const disputeFeedback =
    disputeState.status === 'error'
      ? disputeState.message
      : disputeState.status === 'submitted'
        ? `Dispute opened (${disputeState.disputeId}) with status ${disputeState.disputeStatus}.`
        : disputeState.status === 'submitting'
          ? 'Opening dispute…'
          : undefined;

  return (
    <BookingCompletionScreen
      viewModel={screenState.viewModel}
      reviewRating={reviewRating}
      reviewComment={reviewComment}
      onReviewCommentChange={setReviewComment}
      onReviewRatingChange={setReviewRating}
      onSubmitReview={handleSubmitReview}
      disputeCategory={disputeCategory}
      disputeDescription={disputeDescription}
      onDisputeCategoryChange={setDisputeCategory}
      onDisputeDescriptionChange={setDisputeDescription}
      onOpenDispute={handleOpenDispute}
      onRefresh={load}
      reviewFeedback={reviewFeedback}
      disputeFeedback={disputeFeedback}
      isReviewSubmitting={reviewState.status === 'submitting'}
      isDisputeSubmitting={disputeState.status === 'submitting'}
    />
  );
}
