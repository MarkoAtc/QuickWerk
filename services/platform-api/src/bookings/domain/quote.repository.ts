import type { PricingLineItem } from '../pricing-table';

export type QuoteRecord = {
  quoteId: string;
  bookingId: string;
  customerUserId: string;
  lineItems: readonly PricingLineItem[];
  calloutFeeCents: number;
  laborCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: string;
  pricingTableVersion: string;
  createdAt: string;
  expiresAt: string;
};

export type CreateQuoteInput = Omit<QuoteRecord, 'quoteId'>;

export interface QuoteRepository {
  createQuote(input: CreateQuoteInput): Promise<QuoteRecord>;
  getQuoteById(quoteId: string): Promise<QuoteRecord | null>;
  /**
   * Atomically returns the existing active (non-expired) quote for `bookingId`, or
   * creates `candidate` and returns it if none exists -- the check and the write must
   * happen without an intervening `await`, so two concurrent requests for the same
   * booking can't both observe "no active quote" and each create one.
   */
  getOrCreateActiveQuote(bookingId: string, candidate: CreateQuoteInput, now: Date): Promise<QuoteRecord>;
}

export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');
