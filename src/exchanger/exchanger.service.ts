import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exchanger } from './models/entities/exchanger.entity';
import { AdaptersService } from '../adapters/adapters.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from 'src/pool/models/entities/pool.entity';
import { PoolService } from '../pool/pool.service';

@Injectable()
export class ExchangerService {
  private readonly logger = new Logger(ExchangerService.name);

  constructor(
    @InjectRepository(Exchanger)
    private exchangerRepository: Repository<Exchanger>,
    private poolService: PoolService,
    private adaptersService: AdaptersService,
  ) {}

  async findAll(): Promise<Exchanger[]> {
    return this.exchangerRepository.find();
  }

  async findOne(id: number): Promise<Exchanger> {
    return this.exchangerRepository.findOne(id, { relations: ['pools'] });
  }

  async create(exchange: Exchanger): Promise<Exchanger> {
    return this.exchangerRepository.save(exchange);
  }

  async update(id: number, exchange: Exchanger): Promise<Exchanger> {
    await this.exchangerRepository.update(id, exchange);
    return this.exchangerRepository.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.exchangerRepository.delete(id);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async runScheduler(): Promise<void> {
    console.log('Running scheduler...');
    await this.updateAllPools();
  }

  async updateAllPools(): Promise<void> {
    console.log('updateAllPools from exchanger');

    const exchangers = await this.exchangerRepository.find();
    console.log('exchangers: ', exchangers);

    for (const exchanger of exchangers) {
      if (!exchanger.enable) {
        this.logger.log(
          `Exchanger Id: ${exchanger.id} - ${exchanger.name} is disabled`,
        );
        continue;
      }

      try {
        const pools = await this.adaptersService.getPools(exchanger);
        console.log('Pools from exhanger: ', pools);
        const nowTime = new Date();
        for (let i = 0; i < pools.length; i++) {
          const poolData = pools[i];
          const dbPool = await this.poolService.findByAddress(poolData.address);
          if (dbPool) {
            if (!dbPool.enable) {
              this.logger.log(
                `Pool Id: ${dbPool.id} - ${dbPool.name} is disabled`,
              );
              continue;
            }

            // update data
            dbPool.name = this.getCleanPoolName(poolData.name);
            dbPool.tvl = poolData.tvl ? poolData.tvl : '0';
            dbPool.apr = poolData.apr ? poolData.apr : '0';
            dbPool.updated_at = nowTime;
            await this.poolService.update(dbPool.id, dbPool);
            continue;
          }

          // new pool
          const newPool = new Pool();
          newPool.name = this.getCleanPoolName(poolData.name);
          newPool.address = poolData.address;
          newPool.decimals = poolData.decimals ? poolData.decimals : 0;
          newPool.tvl = poolData.tvl ? poolData.tvl : '0';
          newPool.apr = poolData.apr ? poolData.apr : '0';
          newPool.enable = true;
          newPool.updated_at = nowTime;
          newPool.exchanger = exchanger;
          await this.poolService.create(newPool);
        }
      } catch (e) {
        this.logger.error(
          `Error when update pool. Exchange: ${exchanger.exchanger_type}`,
          e,
        );
      }
    }
  }

  private getCleanPoolName(poolName: string): string {
    return poolName.replace(/LP-|sAMM-|vAMM-|bb-/g, '');
  }
}
