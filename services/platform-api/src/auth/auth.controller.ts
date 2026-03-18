import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/auth')
export class AuthController {
  @Get('session')
  getSessionBootstrap() {
    return {
      resource: 'auth-session',
      sessionState: 'anonymous',
      availableActions: ['sign-in', 'sign-up', 'password-reset'],
      nextStep: 'sign-in',
    };
  }
}