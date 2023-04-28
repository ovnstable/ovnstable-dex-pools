import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from 'src/pool/models/entities/pool.entity';
import { PoolService } from '../pool/pool.service';
import { PlDashboard } from 'src/pool/models/entities/pldashboard.entity';
import { ChainType } from 'src/exchanger/models/inner/chain.type';

@Injectable()
export class SkimService {
  private readonly logger = new Logger(SkimService.name);

  constructor(private poolService: PoolService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScheduler(): Promise<void> {
    console.log('Running scheduler...');
    await this.updatePools();
  }

  async updatePools(): Promise<void> {
    console.log('updatePools from skim');
  }

  async getPools(): Promise<Pool[]> {
    const foundPools: Pool[] = [];
    for (const chain in ChainType) {
      console.log('Chain: ', chain);
      const pools: Pool[] = await this.poolService.getPoolsForSkim(chain);
      console.log('Pools: ', pools);
      const skims: PlDashboard[] = await this.poolService.getSkims(chain);
      console.log('Skims: ', skims);
      for (let i = 0; i < pools.length; i++) {
        const pool = pools[i];
        const check = skims.some(
          (skim) =>
            skim.pool_address.toLowerCase() === pool.address.toLowerCase(),
        );
        console.log(pool.address.toLowerCase() + ' ' + check);
        if (!check) {
          foundPools.push(pool);
        }
      }
    }
    return foundPools;
  }
}
