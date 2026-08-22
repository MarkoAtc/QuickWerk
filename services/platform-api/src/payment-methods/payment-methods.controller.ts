import { Body, Controller, Get, Headers, HttpException, Post, Req, Res } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { PaymentMethodsService } from './payment-methods.service';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

@Controller('api/v1/customers/me/payment-methods')
export class PaymentMethodsController {
  constructor(
    private readonly authService: AuthService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  /**
   * POST /api/v1/customers/me/payment-methods
   * Adds a simulated payment method (label/brand only -- the server generates a fake
   * last4, real card data is never accepted).
   */
  @Post()
  async addPaymentMethod(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const token = extractBearerToken(authorizationHeader);
    const correlationId = resolveCorrelationId({
      headerValue: request.header(correlationIdHeaderName) ?? undefined,
      method: request.method,
      path: request.path,
      token,
      body: (body ?? {}) as Record<string, unknown>,
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    const session = await this.authService.resolveSessionOrNull(token);

    if (!session) {
      throw new HttpException('Sign-in required to add a payment method.', 401);
    }

    if (session.role !== 'customer') {
      throw new HttpException('Only customers can add payment methods.', 403);
    }

    const result = await this.paymentMethodsService.addPaymentMethod(session, body, { correlationId });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.paymentMethod;
  }

  /**
   * GET /api/v1/customers/me/payment-methods
   * Lists the authenticated customer's own simulated payment methods, newest first.
   */
  @Get()
  async listMyPaymentMethods(
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
      throw new HttpException('Sign-in required to view payment methods.', 401);
    }

    if (session.role !== 'customer') {
      throw new HttpException('Only customers can view payment methods.', 403);
    }

    return this.paymentMethodsService.listMyPaymentMethods(session);
  }
}
