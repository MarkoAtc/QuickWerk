import { Body, Controller, Get, Headers, HttpCode, HttpException, Param, Patch, Post, Req, Res } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { DisputesService } from './disputes.service';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

type SubmitDisputeBody = {
  category: string;
  description: string;
};

type ResolveDisputeBody = {
  resolutionNote?: unknown;
};

type CloseDisputeBody = {
  resolutionNote?: unknown;
};

@Controller('api/v1/bookings')
export class DisputesBookingController {
  constructor(
    private readonly authService: AuthService,
    private readonly disputesService: DisputesService,
  ) {}

  /**
   * POST /api/v1/bookings/:bookingId/dispute
   * Submits a dispute for a booking. Accessible by customer or provider.
   */
  @Post(':bookingId/dispute')
  async submitDispute(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('bookingId') bookingId: string,
    @Body() body: SubmitDisputeBody,
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
      throw new HttpException('Sign-in required to submit a dispute.', 401);
    }

    const result = await this.disputesService.submitDispute(
      session,
      bookingId,
      body.category,
      body.description,
      correlationId,
    );

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.dispute;
  }
}

@Controller('api/v1/disputes')
export class DisputesOperatorController {
  constructor(
    private readonly authService: AuthService,
    private readonly disputesService: DisputesService,
  ) {}

  /**
   * GET /api/v1/disputes/pending
   * Returns all open disputes. Operator role only.
   */
  @Get('pending')
  async getPendingDisputes(
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
      throw new HttpException('Sign-in required to view pending disputes.', 401);
    }

    const result = await this.disputesService.getPendingDisputes(session);

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.disputes;
  }

  @Patch(':disputeId/start-review')
  @HttpCode(200)
  async startReviewDispute(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('disputeId') disputeId: string,
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
      throw new HttpException('Sign-in required to review disputes.', 401);
    }

    const result = await this.disputesService.startReviewDispute(session, disputeId, correlationId);
    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.dispute;
  }

  @Patch(':disputeId/resolve')
  @HttpCode(200)
  async resolveDispute(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('disputeId') disputeId: string,
    @Body() body: ResolveDisputeBody,
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
      throw new HttpException('Sign-in required to review disputes.', 401);
    }

    const result = await this.disputesService.resolveDispute(session, disputeId, body?.resolutionNote, correlationId);
    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.dispute;
  }

  @Patch(':disputeId/close')
  @HttpCode(200)
  async closeDispute(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('disputeId') disputeId: string,
    @Body() body: CloseDisputeBody,
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
      throw new HttpException('Sign-in required to review disputes.', 401);
    }

    const result = await this.disputesService.closeDispute(session, disputeId, body?.resolutionNote, correlationId);
    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.dispute;
  }
}
