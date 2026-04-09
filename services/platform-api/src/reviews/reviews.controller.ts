import { Body, Controller, Get, Headers, HttpException, Param, Post, Req, Res } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { ReviewsService } from './reviews.service';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

type SubmitReviewBody = {
  rating: number;
  comment?: string;
};

@Controller('api/v1/bookings')
export class BookingReviewsController {
  constructor(
    private readonly authService: AuthService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Post(':bookingId/reviews')
  async submitReview(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Body() body: SubmitReviewBody,
  ) {
    const token = extractBearerToken(authorizationHeader);
    const correlationId = resolveCorrelationId({
      headerValue: request.header(correlationIdHeaderName) ?? undefined,
      method: request.method,
      path: request.path,
      token,
      body,
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    const session = await this.authService.resolveSessionOrNull(token);
    if (!session) {
      throw new HttpException('Sign-in required to submit a review.', 401);
    }

    const result = await this.reviewsService.submitReview(session, bookingId, body, correlationId);
    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.review;
  }

  @Get(':bookingId/reviews')
  async getBookingReviews(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('bookingId') bookingId: string,
  ) {
    const token = extractBearerToken(authorizationHeader);
    const correlationId = resolveCorrelationId({
      headerValue: request.header(correlationIdHeaderName) ?? undefined,
      method: request.method,
      path: request.path,
      token,
      body: {},
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    const session = await this.authService.resolveSessionOrNull(token);
    if (!session) {
      throw new HttpException('Sign-in required to view booking reviews.', 401);
    }

    const result = await this.reviewsService.getBookingReviews(session, bookingId);
    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.reviews;
  }
}

@Controller('api/v1/providers')
export class ProviderReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':providerUserId/reviews')
  async getProviderReviews(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Param('providerUserId') providerUserId: string,
  ) {
    const correlationId = resolveCorrelationId({
      headerValue: request.header(correlationIdHeaderName) ?? undefined,
      method: request.method,
      path: request.path,
      body: {},
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    const result = await this.reviewsService.getProviderReviews(providerUserId);
    return result.reviews;
  }
}
