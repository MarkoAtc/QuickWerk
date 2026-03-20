import { Body, Controller, Get, Headers, HttpCode, HttpException, Param, Post } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { BookingsService } from './bookings.service';

type CreateBookingRequestBody = {
  requestedService?: string;
};

const extractBearerToken = (authorizationHeader: string | undefined): string | undefined => {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }

  return token;
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

  @Post()
  createBooking(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Body() body: CreateBookingRequestBody,
  ) {
    const session = this.authService.resolveSessionOrNull(extractBearerToken(authorizationHeader));

    if (!session) {
      throw new HttpException('Sign-in required before creating bookings.', 401);
    }

    const result = this.bookingsService.createBooking(session, body);

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.booking;
  }

  @Post(':bookingId/accept')
  @HttpCode(200)
  acceptBooking(@Headers('authorization') authorizationHeader: string | undefined, @Param('bookingId') bookingId: string) {
    const session = this.authService.resolveSessionOrNull(extractBearerToken(authorizationHeader));

    if (!session) {
      throw new HttpException('Sign-in required before accepting bookings.', 401);
    }

    const result = this.bookingsService.acceptBooking(session, bookingId);

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.booking;
  }
}
