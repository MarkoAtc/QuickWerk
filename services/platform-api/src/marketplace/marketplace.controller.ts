import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/bookings')
export class MarketplaceController {
  @Get('preview')
  getMarketplacePreview() {
    return {
      resource: 'marketplace-preview',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          id: 'provider-discovery',
          status: 'preview-ready',
          title: 'Provider discovery preview',
          description:
            'Read-only fixture feed for comparing response speed, trust signals, and first-visit availability.',
          highlights: ['3 local fixture providers', 'service area + response labels', 'review and trust badges'],
          trustBadges: ['ID verified', 'Business docs reviewed'],
          responseSlaHint: 'Median provider response under 8 minutes in pilot fixtures',
          ctaLabel: 'Open provider card',
        },
        {
          id: 'booking-continuation',
          status: 'preview-ready',
          title: 'Booking continuation preview',
          description:
            'Read-only fixture slice showing urgent and scheduled handoff states after auth continuation.',
          highlights: ['urgent + scheduled split', 'next-step summary', 'demo-safe booking context only'],
          trustBadges: ['SLA monitored', 'Status transitions audited'],
          responseSlaHint: 'Urgent preview flow targets first acknowledgement within 5 minutes',
          ctaLabel: 'Start booking flow',
        },
      ],
    };
  }
}
