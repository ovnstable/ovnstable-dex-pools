import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PoolModule } from './pool/pool.module';
import { ExchangerModule } from './exchanger/exchanger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ExternalModule } from './external/external.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    ScheduleModule.forRoot(),
    PoolModule,
    ExchangerModule,
    ExternalModule,
  ],
  controllers: [],
  providers: [],
})

export class AppModule {}
