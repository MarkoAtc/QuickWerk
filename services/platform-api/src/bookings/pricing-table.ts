export type PricingLineItem = {
  label: string;
  amountCents: number;
};

export type PricedBreakdown = {
  calloutFeeCents: number;
  laborCents: number;
  platformFeeCents: number;
  totalCents: number;
  lineItems: readonly PricingLineItem[];
  pricingTableVersion: string;
};

export const PRICING_TABLE_VERSION = 'v1';

type CategoryRate = {
  label: string;
  calloutFeeCents: number;
  hourlyRateCents: number;
  estimatedHours: number;
};

// Estimated hours are a fixed simulated default per category, not a measurement -- there is
// no job-duration tracking anywhere in this codebase (see
// docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md §2). Rates mirror
// design/payment_checkout's reference combination (plumbing, scheduled): $45 callout +
// 2.0h @ $85/hr = $170 labor.
const CATEGORY_RATES: Record<string, CategoryRate> = {
  emergency: { label: 'Emergency', calloutFeeCents: 6000, hourlyRateCents: 9500, estimatedHours: 1.5 },
  plumbing: { label: 'Plumbing', calloutFeeCents: 4500, hourlyRateCents: 8500, estimatedHours: 2.0 },
  electrical: { label: 'Electrical', calloutFeeCents: 4500, hourlyRateCents: 9000, estimatedHours: 1.5 },
  carpenter: { label: 'Carpentry', calloutFeeCents: 4000, hourlyRateCents: 7500, estimatedHours: 2.5 },
  locksmith: { label: 'Locksmith', calloutFeeCents: 5000, hourlyRateCents: 8000, estimatedHours: 1.0 },
  painting: { label: 'Painting', calloutFeeCents: 3500, hourlyRateCents: 6500, estimatedHours: 3.0 },
  cleaning: { label: 'Cleaning', calloutFeeCents: 3000, hourlyRateCents: 5500, estimatedHours: 2.5 },
  handyman: { label: 'Handyman', calloutFeeCents: 4000, hourlyRateCents: 7000, estimatedHours: 2.0 },
};

// Fallback for legacy bookings created before serviceCategory existed, or any unrecognized
// category value -- must never throw, completion-capture has to succeed on existing data.
const FALLBACK_CATEGORY_RATE: CategoryRate = CATEGORY_RATES.handyman;

const PLATFORM_FEE_CENTS = 1250;

// 'urgent' == "Premium rate applies" (see booking-wizard-screen.js's URGENCY_OPTIONS helper
// copy); 'scheduled' and any unrecognized/absent value use the base rate.
const URGENCY_MULTIPLIERS: Record<string, number> = {
  urgent: 1.5,
  scheduled: 1,
};
const DEFAULT_URGENCY_MULTIPLIER = 1;

function resolveCategoryRate(category: string | null | undefined): CategoryRate {
  if (!category) return FALLBACK_CATEGORY_RATE;
  return CATEGORY_RATES[category] ?? FALLBACK_CATEGORY_RATE;
}

function resolveUrgencyMultiplier(urgency: string | null | undefined): number {
  if (!urgency) return DEFAULT_URGENCY_MULTIPLIER;
  return URGENCY_MULTIPLIERS[urgency] ?? DEFAULT_URGENCY_MULTIPLIER;
}

export function computeBookingPrice(
  category: string | null | undefined,
  urgency: string | null | undefined,
): PricedBreakdown {
  const rate = resolveCategoryRate(category);
  const multiplier = resolveUrgencyMultiplier(urgency);

  const calloutFeeCents = Math.round(rate.calloutFeeCents * multiplier);
  const laborCents = Math.round(rate.hourlyRateCents * rate.estimatedHours * multiplier);
  const platformFeeCents = PLATFORM_FEE_CENTS;
  const totalCents = calloutFeeCents + laborCents + platformFeeCents;

  return {
    calloutFeeCents,
    laborCents,
    platformFeeCents,
    totalCents,
    lineItems: [
      { label: 'Base Call-out Fee', amountCents: calloutFeeCents },
      { label: `${rate.label} Labor`, amountCents: laborCents },
      { label: 'Platform Service Fee', amountCents: platformFeeCents },
    ],
    pricingTableVersion: PRICING_TABLE_VERSION,
  };
}
