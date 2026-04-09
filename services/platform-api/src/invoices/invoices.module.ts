import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PostgresClient } from '../persistence/postgres-client';
import { INVOICE_REPOSITORY } from './domain/invoice.repository';
import { InMemoryInvoiceRepository } from './infrastructure/in-memory-invoice.repository';
import { resolveInvoiceRepository } from './infrastructure/invoice-repository.provider';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuthModule],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InMemoryInvoiceRepository,
    {
      provide: INVOICE_REPOSITORY,
      inject: [InMemoryInvoiceRepository, PostgresClient],
      useFactory: (inMemoryRepository: InMemoryInvoiceRepository, postgresClient: PostgresClient) =>
        resolveInvoiceRepository({
          inMemoryRepository,
          postgresClient,
        }),
    },
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
