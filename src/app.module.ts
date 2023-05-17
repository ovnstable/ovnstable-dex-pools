import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PoolModule } from './pool/pool.module';
import { ExchangerModule } from './exchanger/exchanger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SkimModule } from './skim/skim.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    ScheduleModule.forRoot(),
    PoolModule,
    SkimModule,
    ExchangerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
