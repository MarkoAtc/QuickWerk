import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { AuthService } from './auth.service';

type SignInRequestBody = {
  email?: string;
  role?: string;
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

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('session')
  getSession(@Headers('authorization') authorizationHeader?: string) {
    return this.authService.getSession(extractBearerToken(authorizationHeader));
  }

  @Post('sign-in')
  signIn(@Body() body: SignInRequestBody) {
    return this.authService.signIn(body);
  }

  @Post('sign-out')
  signOut(@Headers('authorization') authorizationHeader?: string) {
    return this.authService.signOut(extractBearerToken(authorizationHeader));
  }
}
