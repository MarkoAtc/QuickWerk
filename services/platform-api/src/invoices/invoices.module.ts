import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InMemoryInvoiceRepository } from './infrastructure/in-memory-invoice.repository';
import { invoiceRepositoryProvider } from './infrastructure/invoice-repository.provider';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuthModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InMemoryInvoiceRepository, invoiceRepositoryProvider],
  exports: [InvoicesService],
})
export class InvoicesModule {}
