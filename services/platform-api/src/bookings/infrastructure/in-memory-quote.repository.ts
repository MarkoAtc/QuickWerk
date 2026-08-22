import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { CreateQuoteInput, QuoteRecord, QuoteRepository } from '../domain/quote.repository';

@Injectable()
export class InMemoryQuoteRepository implements QuoteRepository {
  private readonly quotes = new Map<string, QuoteRecord>();

  async createQuote(input: CreateQuoteInput): Promise<QuoteRecord> {
    const quoteId = randomUUID();
    const record: QuoteRecord = { quoteId, ...input };
    this.quotes.set(quoteId, record);
    return record;
  }

  async getQuoteById(quoteId: string): Promise<QuoteRecord | null> {
    return this.quotes.get(quoteId) ?? null;
  }

  async getActiveQuoteForBooking(bookingId: string, now: Date): Promise<QuoteRecord | null> {
    const active = Array.from(this.quotes.values())
      .filter((quote) => quote.bookingId === bookingId && Date.parse(quote.expiresAt) > now.getTime())
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    return active[0] ?? null;
  }
}
