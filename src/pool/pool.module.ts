import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pool } from './models/entities/pool.entity';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';
import { PoolsController } from './pools.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pool])],
  providers: [PoolService],
  controllers: [PoolController, PoolsController],
  exports: [PoolService],
})
export class PoolModule {}
