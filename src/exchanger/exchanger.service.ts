import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AdaptersService } from '../adapters/adapters.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from '../pool/models/entities/pool.entity';
import { PoolService } from '../pool/pool.service';
import { ExchangerType } from './models/inner/exchanger.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExchangerService {
  private readonly logger = new Logger(ExchangerService.name);

  constructor(
    private poolService: PoolService,
    private adaptersService: AdaptersService,
    private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScheduler(): Promise<void> {
    if (this.configService.get('NODE_ENV') === 'prod') {
      console.log('Running scheduler...');
      await this.updateAllPools();
    } else {
      console.log('Scheduler is disabled');
    }
  }

  async updateAllPools(): Promise<void> {
    console.log('updateAllPools from exchanger');

    const exchanger_types = Object.values(ExchangerType);
    console.log('exchangers: ', exchanger_types);

    for (const exchanger_type of exchanger_types) {
      await this.updateExchangerPool(exchanger_type);
    }
  }

  async updateSinglePool(exchanger: ExchangerType): Promise<void> {
    if (Object.values(ExchangerType).includes(exchanger)) {
      await this.updateExchangerPool(exchanger);
    } else {
      throw new BadRequestException('Exchanger type does not exist');
    }
  }

  private async updateExchangerPool(exchanger_type: ExchangerType): Promise<void> {
    try {
      this.logger.log('Process with: ' + exchanger_type);
      const pools = await this.adaptersService.getPools(exchanger_type);
      console.log('Pools from exchanger: ', pools);
      const nowTime = new Date();
      for (let i = 0; i < pools.length; i++) {
        const poolData = pools[i];
        const dbPool = await this.poolService.findByAddress(poolData.address);
        if (dbPool) {
          if (!dbPool.add_to_sync) {
            this.logger.log(`Pool Id: ${dbPool.name} is disabled`);
            continue;
          }

          // update data
          dbPool.name = this.getCleanPoolName(poolData.name);
          dbPool.tvl = poolData.tvl ? poolData.tvl : '0';
          dbPool.apr = poolData.apr ? poolData.apr : dbPool.apr; // old value
          dbPool.chain = poolData.chain;
          dbPool.update_date = nowTime;
          await this.poolService.update(dbPool.address, dbPool);
          continue;
        }

        // new pool
        const newPool = new Pool();
        newPool.name = this.getCleanPoolName(poolData.name);
        newPool.address = poolData.address;
        newPool.tvl = poolData.tvl ? poolData.tvl : '0';
        newPool.apr = poolData.apr ? poolData.apr : '0';
        newPool.add_to_sync = true;
        newPool.update_date = nowTime;
        newPool.platform = exchanger_type;
        newPool.chain = poolData.chain;

        await this.poolService.create(newPool);
      }
    } catch (e) {
      this.logger.error(`Error when update pool. Exchange: ${exchanger_type}`, e);
    }
  }

  private getCleanPoolName(poolName: string): string {
    return poolName.replace(/LP-|sAMM-|vAMM-|bb-|crAMM-|s-|sAMMV2-|vAMMV2-|BP-f|3CRV-f/g, '');
  }
}
