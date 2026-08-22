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

  // No `await` between the read and the write below -- the whole body runs as one
  // synchronous unit of work before yielding to the event loop, so two concurrent
  // calls for the same bookingId can't both observe "no active quote" and each insert
  // one. Only safe because Map operations here are synchronous; do not add an await
  // between the filter and the `set` call.
  async getOrCreateActiveQuote(bookingId: string, candidate: CreateQuoteInput, now: Date): Promise<QuoteRecord> {
    const active = Array.from(this.quotes.values())
      .filter((quote) => quote.bookingId === bookingId && Date.parse(quote.expiresAt) > now.getTime())
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    if (active[0]) {
      return active[0];
    }

    const quoteId = randomUUID();
    const record: QuoteRecord = { quoteId, ...candidate };
    this.quotes.set(quoteId, record);
    return record;
  }
}
