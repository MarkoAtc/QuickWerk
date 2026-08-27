import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import ReviewScreen from '../src/features/booking/review-screen';
import { loadReviewScreenData, submitReview } from '../src/features/booking/review-screen-actions';
import {
  composeReviewComment,
  findExistingReview,
  getReviewRatingLabel,
  toggleReviewHighlight,
} from '../src/features/booking/review-screen-presenter';
import { resolveCompletionBookingIdParam } from '../src/features/booking/booking-completion-route-state';
import { productAppShell } from '../src/shared/app-shell';
import { ProductScreenShell } from '../src/shared/product-screen-shell';
import { resolveSessionToken, useSession } from '../src/shared/session-provider';

const initialSubmitState = { status: 'idle' };

export default function ReviewRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session, signOut } = useSession();
  const bookingId = resolveCompletionBookingIdParam(params.bookingId);

  const [screenState, setScreenState] = useState({ status: 'loading' });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedHighlights, setSelectedHighlights] = useState([]);
  const [photoAttached, setPhotoAttached] = useState(false);
  const [submitState, setSubmitState] = useState(initialSubmitState);

  const load = useCallback(async () => {
    if (session.status !== 'authenticated') {
      return;
    }

    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      signOut();
      router.replace('/auth');
      return;
    }

    if (!bookingId) {
      setScreenState({ status: 'error', message: 'Missing booking id in route params.' });
      return;
    }

    setScreenState({ status: 'loading' });

    const result = await loadReviewScreenData(sessionToken, bookingId);
    if (result.status === 'error') {
      setScreenState(result);
      return;
    }

    const existingReview = findExistingReview(result.reviews, session.role);
    if (existingReview) {
      setRating(existingReview.rating);
      setSubmitState({ status: 'submitted', review: existingReview, existing: true });
    } else {
      setSubmitState(initialSubmitState);
    }

    setScreenState({ ...result, existingReview });
  }, [bookingId, router, session, signOut]);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      router.replace('/auth');
      return;
    }

    load().catch((error) => {
      setScreenState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unexpected review loading error.',
      });
    });
  }, [load, router, session.status]);

  if (session.status !== 'authenticated') {
    return null;
  }

  const sessionToken = resolveSessionToken(session);
  if (!sessionToken) {
    return null;
  }

  const close = () => {
    if (bookingId) {
      router.replace({ pathname: '/booking-completion', params: { bookingId } });
      return;
    }

    router.back();
  };

  const handleSubmit = async () => {
    if (!bookingId || submitState.status === 'submitting' || submitState.status === 'submitted') {
      return;
    }

    setSubmitState({ status: 'submitting' });
    const result = await submitReview(
      sessionToken,
      bookingId,
      rating,
      composeReviewComment(selectedHighlights, comment),
    );

    setSubmitState(result);
  };

  if (screenState.status === 'loading') {
    return (
      <ProductScreenShell title="Review" subtitle="Loading completed booking details." testID="review-loading">
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator color={productAppShell.theme.color.primary} size="small" />
          <Text style={{ color: '#64748B', marginTop: 8 }}>Loading review details…</Text>
        </View>
      </ProductScreenShell>
    );
  }

  if (screenState.status === 'error') {
    return (
      <ProductScreenShell title="Review" subtitle="Could not open the review form." testID="review-error">
        <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderRadius: 12, borderWidth: 1, padding: 16 }}>
          <Text style={{ color: '#B91C1C' }}>{screenState.message}</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
            <Pressable accessibilityRole="button" onPress={load} testID="review-retry">
              <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Retry</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={close} testID="review-error-close">
              <Text style={{ color: '#475569', fontWeight: '700' }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </ProductScreenShell>
    );
  }

  return (
    <ReviewScreen
      booking={screenState.booking}
      provider={screenState.provider}
      rating={rating}
      ratingLabel={getReviewRatingLabel(rating)}
      comment={comment}
      selectedHighlights={selectedHighlights}
      photoAttached={photoAttached}
      submitState={submitState}
      onClose={close}
      onRatingChange={setRating}
      onCommentChange={setComment}
      onToggleHighlight={(highlight) => {
        setSelectedHighlights((current) => toggleReviewHighlight(current, highlight));
      }}
      onTogglePhoto={() => setPhotoAttached((current) => !current)}
      onSubmit={handleSubmit}
    />
  );
}
