import { Module } from '@nestjs/common';
import { CoingekoService } from './coingeko.service';

@Module({
  providers: [CoingekoService],
  exports: [CoingekoService],
})
export class ExternalModule {}
