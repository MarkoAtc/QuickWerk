import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpException,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { PayoutsService } from './payouts.service';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

type ListMyPayoutsQuery = {
  cursor?: string;
  limit?: string;
};

const defaultPayoutPageLimit = 20;
const maxPayoutPageLimit = 100;

@Controller('api/v1/providers/me/payouts')
export class PayoutsController {
  constructor(
    private readonly authService: AuthService,
    private readonly payoutsService: PayoutsService,
  ) {}

  /**
   * GET /api/v1/providers/me/payouts
   * Returns the list of payouts for the authenticated provider.
   */
  @Get()
  async listMyPayouts(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Query() query: ListMyPayoutsQuery,
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
      throw new HttpException('Sign-in required to view payouts.', 401);
    }

    if (session.role !== 'provider') {
      throw new HttpException('Only providers can view payouts.', 403);
    }

    return this.payoutsService.getMyPayouts(session, {
      cursor: query.cursor ?? null,
      limit: parsePayoutLimit(query.limit, defaultPayoutPageLimit, maxPayoutPageLimit),
    });
  }

  /**
   * GET /api/v1/providers/me/payouts/:payoutId
   * Returns a single payout by ID for the authenticated provider.
   */
  @Get(':payoutId')
  async getPayoutById(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('payoutId') payoutId: string,
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
      throw new HttpException('Sign-in required to view payout details.', 401);
    }

    if (session.role !== 'provider') {
      throw new HttpException('Only providers can view payout details.', 403);
    }

    const result = await this.payoutsService.getPayoutById(session, payoutId);

    if (!result.ok) {
      throw new HttpException(result.error, result.statusCode);
    }

    return result.payout;
  }
}

function parsePayoutLimit(
  rawLimit: string | undefined,
  fallback: number,
  max: number,
): number {
  if (rawLimit == null || rawLimit.trim() === '') {
    return fallback;
  }

  const parsed = Number(rawLimit);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('Query parameter "limit" must be a positive integer.');
  }

  return Math.min(parsed, max);
}
