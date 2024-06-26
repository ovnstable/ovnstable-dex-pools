import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool } from './models/entities/pool.entity';
import { PoolDto } from './models/dto/pool.dto';
import { PlDashboard } from './models/entities/pldashboard.entity';

import {
  TelegramService,
  TelegramServiceConfig,
} from '@overnight-contracts/eth-utils/dist/module/telegram/telegramService';

@Injectable()
export class PoolService {
  POOLS_DAPP_TVL_LIMIT = 10_000;
  private readonly logger = new Logger(PoolService.name);
  telegramService: TelegramService;

  constructor(
    @InjectRepository(Pool)
    private poolRepository: Repository<Pool>,
    @InjectRepository(PlDashboard)
    private plDashboardRepository: Repository<PlDashboard>,
  ) {
    const privateKey = process.env['PRIVATE_KEY'];

    if (!process.env.TELEGRAM_BOT_ENABLED) return;

    if (privateKey) {
      const config = new TelegramServiceConfig();
      config.name = 'Dex-Pool Service';
      config.polling = false;
      this.telegramService = new TelegramService(config);

      this.telegramService.sendMessage('DexPool service is running');
    } else {
      this.logger.error('PRIVATE_KEY is not defined -> skim service cannot send transaction');
    }
  }

  async findAll(): Promise<Pool[]> {
    return await this.poolRepository.find();
  }

  async findOne(address: string): Promise<Pool> {
    return await this.poolRepository.findOne({ where: { address } });
  }

  async findByAddress(_address: string): Promise<Pool> {
    return this.innerFindByAddress(_address);
  }

  async create(pool: Pool): Promise<Pool> {
    return await this.poolRepository.save(pool);
  }

  async update(address: string, pool: Pool): Promise<void> {
    await this.poolRepository.update(address, pool);
  }

  async saveAll(pools: Pool[]) {
    const savedPools: Pool[] = [];

    for (const pool of pools) {
      const savedPool = await this.poolRepository.save(pool);
      savedPools.push(savedPool);
    }

    return savedPools;
  }

  async delete(id: number): Promise<void> {
    await this.poolRepository.delete(id);
  }

  async getByAddress(address: string): Promise<PoolDto> {
    const dbPool = await this.innerFindByAddress(address);
    return new PoolDto(dbPool);
  }

  async getAll(): Promise<PoolDto[]> {
    const pools: Pool[] = await this.getPoolsWithTvlLimit(this.POOLS_DAPP_TVL_LIMIT);
    const poolDtos: PoolDto[] = [];

    for (let i = 0; i < pools.length; i++) {
      poolDtos.push(new PoolDto(pools[i]));
    }

    return poolDtos;
  }

  private async innerFindByAddress(address: string): Promise<Pool> {
    return await this.poolRepository.findOne({ where: { address } });
  }

  private async getPoolsWithTvlLimit(limit: number): Promise<Pool[]> {
    const queryBuilder = this.poolRepository.createQueryBuilder('pool');

    queryBuilder.where('pool.tvl > :tvl', { tvl: limit });
    queryBuilder.orderBy('pool.tvl', 'DESC');
    const pools = await queryBuilder.getMany();
    return pools;
  }

  async getPoolsForSkim(chain: string): Promise<Pool[]> {
    const queryBuilder = this.poolRepository.createQueryBuilder('pool');

    queryBuilder.where('pool.tvl > :tvl', { tvl: this.POOLS_DAPP_TVL_LIMIT });
    queryBuilder.andWhere('pool.chain = :chain', { chain: chain });
    const pools = await queryBuilder.getMany();
    return pools;
  }

  async getSkims(chain: string): Promise<PlDashboard[]> {
    const queryBuilder = this.plDashboardRepository.createQueryBuilder('pl_dashboard');

    queryBuilder.where('pl_dashboard.chain = :chain', { chain: chain });
    const skims = await queryBuilder.getMany();
    return skims;
  }
}
