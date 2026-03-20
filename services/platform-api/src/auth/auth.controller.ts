import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';

import { extractBearerToken } from '../http/auth-header';
import { correlationIdHeaderName, resolveCorrelationId } from '../observability/correlation-id';
import { AuthService } from './auth.service';

type SignInRequestBody = {
  email?: string;
  role?: string;
};

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('session')
  async getSession(@Headers('authorization') authorizationHeader?: string) {
    return this.authService.getSession(extractBearerToken(authorizationHeader));
  }

  @Post('sign-in')
  async signIn(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Body() body: SignInRequestBody,
  ) {
    const correlationId = resolveCorrelationId({
      headerValue: request.header(correlationIdHeaderName) ?? undefined,
      method: request.method,
      path: request.path,
      body,
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    return this.authService.signIn(body, {
      correlationId,
    });
  }

  @Post('sign-out')
  async signOut(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    const token = extractBearerToken(authorizationHeader);
    const correlationId = resolveCorrelationId({
      headerValue: request.header(correlationIdHeaderName) ?? undefined,
      method: request.method,
      path: request.path,
      token,
    });

    response.setHeader(correlationIdHeaderName, correlationId);

    return this.authService.signOut(token, {
      correlationId,
    });
  }
}
