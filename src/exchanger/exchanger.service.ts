import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AdaptersService } from '../adapters/adapters.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from '../pool/models/entities/pool.entity';
import { PoolService } from '../pool/pool.service';
import { ExchangerType } from './models/inner/exchanger.type';
import { ConfigService } from '@nestjs/config';
import { TelegramLogger } from 'src/telegram/telegram-logger.service';

@Injectable()
export class ExchangerService {
  private readonly logger = new Logger(ExchangerService.name);

  constructor(
    private poolService: PoolService,
    private adaptersService: AdaptersService,
    private configService: ConfigService,
    private telegramLogger: TelegramLogger,
  ) {
    this.telegramLogger.setContext(ExchangerService.name);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScheduler(): Promise<void> {
    if (this.configService.get('NODE_ENV') === 'prod') {
      console.log('Running scheduler...');
      await this.updateAllPools();
    } else {
      console.log('Scheduler is disabled');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async showLastUpdate() {
    if (this.configService.get('NODE_ENV') === 'prod') {
      const pools = await this.poolService.findAll();
      const now = new Date();

      const res: { platform: string; poolName: string; timeSinceUpdate: number }[] = pools.map(pool => {
        const timeSinceUpdate = now.getTime() - new Date(pool.update_date).getTime();
        return { platform: pool.platform, poolName: pool.name, timeSinceUpdate };
      });

      this.telegramLogger.lastUpdate(res);
    } else {
      console.log('Scheduler is disabled');
    }
  }

  async updateAllPools(): Promise<void> {
    console.log('updateAllPools from exchanger');

    const exchanger_types = Object.values(ExchangerType);
    console.log('exchangers: ', exchanger_types);

    const startTime = Date.now();

    const success = [];
    const fail = [];
    for (const exchanger_type of exchanger_types) {
      try {
        await this.updateExchangerPool(exchanger_type);
        success.push(exchanger_type);
      } catch (e) {
        console.log('added error', e);
        fail.push(exchanger_type);
      }
    }

    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000; // Elapsed time in seconds

    this.telegramLogger.alertEnd(success, fail, elapsedTime);
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
          dbPool.pool_version = poolData.pool_version;
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
        newPool.pool_version = poolData.pool_version;

        await this.poolService.create(newPool);
      }
    } catch (e) {
      this.logger.error(`Error when update pool. Exchange: ${exchanger_type}`, e);
      throw new Error(e);
    }
  }

  private getCleanPoolName(poolName: string): string {
    return poolName.replace(/LP-|sAMM-|vAMM-|bb-|crAMM-|s-|sAMMV2-|vAMMV2-|BP-f|3CRV-f|CL100-|CL1-|CL200-|CL50-/g, '');
  }
}
