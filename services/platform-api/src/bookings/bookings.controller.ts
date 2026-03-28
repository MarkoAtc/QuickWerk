import { Body, Controller, Get, Headers, HttpCode, HttpException, Param, Post, Req, Res } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { BookingsService } from './bookings.service';

type CreateBookingRequestBody = {
  requestedService?: string;
};

type DeclineBookingRequestBody = {
  declineReason?: string;
};

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

@Controller('api/v1/bookings')
export class BookingsController {
  constructor(
    private readonly authService: AuthService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get('preview')
  getMarketplacePreview() {
    return this.bookingsService.getMarketplacePreview();
  }

  @Get()
  async listBookings(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
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
      throw new HttpException('Sign-in required to list bookings.', 401);
    }

    return this.bookingsService.listBookings(session);
  }

  @Get(':bookingId')
  async getBooking(
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
      throw new HttpException('Sign-in required to view booking details.', 401);
    }

    const result = await this.bookingsService.getBooking(session, bookingId);

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.booking;
  }

  @Post()
  async createBooking(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Body() body: CreateBookingRequestBody,
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
      throw new HttpException('Sign-in required before creating bookings.', 401);
    }

    const result = await this.bookingsService.createBooking(session, body, {
      correlationId,
    });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.booking;
  }

  @Post(':bookingId/accept')
  @HttpCode(200)
  async acceptBooking(
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
      body: {
        bookingId,
      },
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    const session = await this.authService.resolveSessionOrNull(token);

    if (!session) {
      throw new HttpException('Sign-in required before accepting bookings.', 401);
    }

    const result = await this.bookingsService.acceptBooking(session, bookingId, {
      correlationId,
    });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.booking;
  }

  /**
   * POST /api/v1/bookings/:bookingId/decline
   * Provider declines a submitted booking.
   */
  @Post(':bookingId/decline')
  @HttpCode(200)
  async declineBooking(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Body() body: DeclineBookingRequestBody,
  ) {
    const token = extractBearerToken(authorizationHeader);
    const correlationId = resolveCorrelationId({
      headerValue: request.header(correlationIdHeaderName) ?? undefined,
      method: request.method,
      path: request.path,
      token,
      body: { bookingId },
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    const session = await this.authService.resolveSessionOrNull(token);

    if (!session) {
      throw new HttpException('Sign-in required before declining bookings.', 401);
    }

    const safeBody = body != null && typeof body === 'object' ? body : {};
    const declineReason =
      typeof (safeBody as DeclineBookingRequestBody).declineReason === 'string'
        ? (safeBody as DeclineBookingRequestBody).declineReason
        : undefined;

    const result = await this.bookingsService.declineBooking(session, bookingId, { declineReason }, {
      correlationId,
    });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.booking;
  }
}
