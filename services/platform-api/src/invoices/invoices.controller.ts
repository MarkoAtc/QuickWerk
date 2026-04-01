import { Controller, Get, Headers, HttpException, Param, Req, Res } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { InvoicesService } from './invoices.service';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

@Controller('api/v1/bookings')
export class InvoicesController {
  constructor(
    private readonly authService: AuthService,
    private readonly invoicesService: InvoicesService,
  ) {}

  /**
   * GET /api/v1/bookings/:bookingId/invoice
   * Returns the structured invoice for a booking. Accessible by customer or provider on the booking.
   */
  @Get(':bookingId/invoice')
  async getBookingInvoice(
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
      throw new HttpException('Sign-in required to view invoice.', 401);
    }

    const result = await this.invoicesService.getInvoiceByBookingId(session, bookingId);

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.invoice;
  }
}
