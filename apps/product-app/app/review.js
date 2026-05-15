import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import ReviewScreen from '../src/features/booking/review-screen';
import { loadBookingReviews, submitBookingReview } from '../src/features/booking/review-screen-actions';

const initialLoadState = { status: 'loading', reviews: [] };
const initialSubmitState = { status: 'idle' };

export default function ReviewRoute() {
  const params = useLocalSearchParams();
  const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loadState, setLoadState] = useState(initialLoadState);
  const [submitState, setSubmitState] = useState(initialSubmitState);

  const refresh = useCallback(async () => {
    if (!bookingId || typeof bookingId !== 'string') {
      setLoadState({ status: 'error', message: 'Missing booking id.', reviews: [] });
      return;
    }

    setLoadState({ status: 'loading', reviews: [] });

    try {
      const result = await loadBookingReviews({ bookingId });

      if (result.status === 'error') {
        setLoadState({ status: 'error', message: result.message, reviews: [] });
        return;
      }

      setLoadState({ status: 'loaded', reviews: result.reviews });
    } catch (error) {
      setLoadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unexpected review loading error.',
        reviews: [],
      });
    }
  }, [bookingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = useCallback(async () => {
    if (!bookingId || typeof bookingId !== 'string') {
      setSubmitState({ status: 'error', message: 'Missing booking id.' });
      return;
    }

    setSubmitState({ status: 'submitting' });

    try {
      const result = await submitBookingReview({
        bookingId,
        rating,
        comment,
      });

      if (result.status === 'error') {
        setSubmitState({ status: 'error', message: result.message });
        return;
      }

      setSubmitState({ status: 'submitted' });
      await refresh();
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unexpected review submit error.',
      });
    }
  }, [bookingId, rating, comment, refresh]);

  return (
    <ReviewScreen
      headline="Review the completed booking"
      subheadline="Keep customer feedback structured, visible, and useful for future quality control."
      rating={rating}
      comment={comment}
      onRatingChange={setRating}
      onCommentChange={setComment}
      onSubmit={handleSubmit}
      onRefresh={refresh}
      submitState={submitState}
      loadState={loadState}
    />
  );
}
