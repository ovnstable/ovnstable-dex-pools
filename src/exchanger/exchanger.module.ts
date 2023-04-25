import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exchanger } from './models/entities/exchanger.entity';
import { ExchangerService } from './exchanger.service';
import { ExchangeController } from './exchanger.controller';
import { AdaptersModule } from '../adapters/adapters.module';
import { PoolModule } from '../pool/pool.module';

@Module({
  imports: [TypeOrmModule.forFeature([Exchanger]), AdaptersModule, PoolModule],
  providers: [ExchangerService],
  controllers: [ExchangeController],
  exports: [ExchangerService],
})
export class ExchangerModule {}
