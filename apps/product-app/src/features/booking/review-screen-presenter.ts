import type { ReviewRecord } from '@quickwerk/domain';

export const reviewHighlightOptions = [
  'Professional',
  'Punctual',
  'Fast Fix',
  'Clean Workspace',
  'Great Value',
  'Safe Equipment',
] as const;

export type ReviewHighlight = (typeof reviewHighlightOptions)[number];

const reviewRatingLabels: Readonly<Record<number, string>> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function getReviewRatingLabel(rating: number): string {
  return reviewRatingLabels[rating] ?? 'Select a rating';
}

export function toggleReviewHighlight(
  selected: readonly ReviewHighlight[],
  highlight: ReviewHighlight,
): ReviewHighlight[] {
  if (selected.includes(highlight)) {
    return selected.filter((candidate) => candidate !== highlight);
  }

  return [...selected, highlight];
}

export function composeReviewComment(
  highlights: readonly ReviewHighlight[],
  narrative: string,
): string | undefined {
  const highlightSummary = highlights.length > 0
    ? `Highlights: ${highlights.join(', ')}`
    : '';
  const trimmedNarrative = narrative.trim();
  const composed = [highlightSummary, trimmedNarrative].filter(Boolean).join('\n\n');

  return composed || undefined;
}

export function findExistingReview(
  reviews: readonly ReviewRecord[],
  authorRole: ReviewRecord['authorRole'],
): ReviewRecord | undefined {
  return reviews.find((review) => review.authorRole === authorRole);
}
