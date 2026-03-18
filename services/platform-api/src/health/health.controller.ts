import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: 'platform-api',
      status: 'bootstrap-ready',
    };
  }
}