import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool } from './models/entities/pool.entity';
import { PoolDto } from './models/dto/pool.dto';

@Injectable()
export class PoolService {
  POOLS_DAPP_TVL_LIMIT = 10_000;

  constructor(
    @InjectRepository(Pool)
    private poolRepository: Repository<Pool>,
  ) {}

  async findAll(includeExchanger: boolean): Promise<Pool[]> {
    const relations = includeExchanger ? ['exchanger'] : [];
    console.log('find all relations: ', relations);

    return await this.poolRepository.find({ relations: relations });
  }

  async findOne(id: number): Promise<Pool> {
    return await this.poolRepository.findOne(id);
  }

  async findByAddress(_address: string): Promise<Pool> {
    return this.innerFindByAddress(_address, false);
  }

  async create(pool: Pool): Promise<Pool> {
    return await this.poolRepository.save(pool);
  }

  async update(id: number, pool: Pool): Promise<void> {
    await this.poolRepository.update(id, pool);
  }

  async delete(id: number): Promise<void> {
    await this.poolRepository.delete(id);
  }
  async getByAddress(address: string): Promise<PoolDto> {
    const dbPool = await this.innerFindByAddress(address, true);
    return new PoolDto(dbPool);
  }
  async getAll(): Promise<PoolDto[]> {
    const pools: Pool[] = await this.getPoolsWithTvlLimit(
      this.POOLS_DAPP_TVL_LIMIT,
      true,
    );
    const poolDtos: PoolDto[] = [];

    for (let i = 0; i < pools.length; i++) {
      poolDtos.push(new PoolDto(pools[i]));
    }

    return poolDtos;
  }

  private async innerFindByAddress(
    _address: string,
    includeExchanger: boolean,
  ): Promise<Pool> {
    const relations = includeExchanger ? ['exchanger'] : [];
    console.log('find one relations: ', relations);

    return await this.poolRepository.findOne(
      { address: _address },
      { relations: relations },
    );
  }

  private async getPoolsWithTvlLimit(
    limit: number,
    includeExchanger: boolean,
  ): Promise<Pool[]> {
    const queryBuilder = this.poolRepository.createQueryBuilder('pool');

    if (includeExchanger) {
      queryBuilder.leftJoinAndSelect('pool.exchanger', 'exchanger');
    }

    queryBuilder.where('pool.tvl > :tvl', { tvl: limit });
    queryBuilder.orderBy('pool.tvl', 'DESC');
    const pools = await queryBuilder.getMany();
    return pools;
  }
}
