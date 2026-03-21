import { Global, Module } from '@nestjs/common';

import { PostgresClient } from './postgres-client';

@Global()
@Module({
  providers: [PostgresClient],
  exports: [PostgresClient],
})
export class PersistenceModule {}
