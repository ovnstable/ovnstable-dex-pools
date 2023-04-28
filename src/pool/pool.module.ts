import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pool } from './models/entities/pool.entity';
import { PlDashboard } from './models/entities/pldashboard.entity';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';
import { PoolsController } from './pools.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pool, PlDashboard])],
  providers: [PoolService],
  controllers: [PoolController, PoolsController],
  exports: [PoolService],
})
export class PoolModule {}
