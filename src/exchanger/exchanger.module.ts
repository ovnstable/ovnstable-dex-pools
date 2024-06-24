import { Module } from '@nestjs/common';

import { ExchangerService } from './exchanger.service';
import { ExchangeController } from './exchanger.controller';
import { AdaptersModule } from '../adapters/adapters.module';
import { PoolModule } from '../pool/pool.module';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  imports: [AdaptersModule, PoolModule, TelegramModule],
  providers: [ExchangerService],
  controllers: [ExchangeController],
  exports: [ExchangerService],
})
export class ExchangerModule {}
