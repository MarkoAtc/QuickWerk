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
  getActiveQuoteForBooking(bookingId: string, now: Date): Promise<QuoteRecord | null>;
}

export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');
