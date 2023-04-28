import { Module } from '@nestjs/common';

import { SkimService } from './skim.service';
import { SkimController } from './skim.controller';
import { AdaptersModule } from '../adapters/adapters.module';
import { PoolModule } from '../pool/pool.module';

@Module({
  imports: [AdaptersModule, PoolModule],
  providers: [SkimService],
  controllers: [SkimController],
  exports: [SkimService],
})
export class SkimModule {}
