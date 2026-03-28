import { Body, Controller, Get, Headers, HttpCode, HttpException, Param, Post, Req, Res } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { ProvidersService } from './providers.service';

type SubmitVerificationBody = {
  businessName?: string;
  tradeCategories?: string[];
  serviceArea?: string;
  documents?: Array<{
    filename?: string;
    mimeType?: string;
    description?: string;
  }>;
};

type ReviewVerificationBody = {
  decision?: string;
  reviewNote?: string;
};

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

@Controller('api/v1/providers')
export class ProvidersController {
  constructor(
    private readonly authService: AuthService,
    private readonly providersService: ProvidersService,
  ) {}

  /**
   * POST /api/v1/providers/me/verification
   * Provider submits their onboarding verification request with document metadata.
   */
  @Post('me/verification')
  @HttpCode(201)
  async submitVerification(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Body() body: SubmitVerificationBody,
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
      throw new HttpException('Sign-in required to submit verification.', 401);
    }

    const result = await this.providersService.submitVerification(session, body, { correlationId });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.verification;
  }

  /**
   * GET /api/v1/providers/me/verification
   * Provider checks their own verification status.
   */
  @Get('me/verification')
  async getMyVerificationStatus(
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
      throw new HttpException('Sign-in required to view verification status.', 401);
    }

    const result = await this.providersService.getMyVerificationStatus(session, { correlationId });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.verification ?? { status: 'not-submitted' };
  }

  /**
   * GET /api/v1/providers/verifications/pending
   * Operator lists all pending verifications (admin review queue).
   */
  @Get('verifications/pending')
  async listPendingVerifications(
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
      throw new HttpException('Sign-in required.', 401);
    }

    const result = await this.providersService.listPendingVerifications(session, { correlationId });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.verifications;
  }

  /**
   * GET /api/v1/providers/verifications/:verificationId
   * Operator views a specific verification record.
   */
  @Get('verifications/:verificationId')
  async getVerification(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('verificationId') verificationId: string,
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
      throw new HttpException('Sign-in required.', 401);
    }

    const result = await this.providersService.getVerificationById(session, verificationId, { correlationId });

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.verification;
  }

  /**
   * POST /api/v1/providers/verifications/:verificationId/review
   * Operator approves or rejects a provider verification.
   */
  @Post('verifications/:verificationId/review')
  @HttpCode(200)
  async reviewVerification(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('verificationId') verificationId: string,
    @Body() body: ReviewVerificationBody,
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
      throw new HttpException('Sign-in required to review verifications.', 401);
    }

    const decision = body.decision?.trim().toLowerCase();
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new HttpException('Decision must be "approved" or "rejected".', 400);
    }

    const result = await this.providersService.reviewVerification(
      session,
      verificationId,
      { decision, reviewNote: body.reviewNote },
      { correlationId },
    );

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.verification;
  }
}
