import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PoolModule } from './pool/pool.module';
import { ExchangerModule } from './exchanger/exchanger.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    ScheduleModule.forRoot(),
    PoolModule,
    ExchangerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
