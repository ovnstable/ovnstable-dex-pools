import { Pool } from '../entities/pool.entity';

export class PoolDto {
  platform: string;

  name: string;

  address: string;

  tvl: string;

  apr: string;

  updateDate: Date;

  constructor(pool: Pool) {
    this.platform = pool.exchanger.exchanger_type;
    this.name = pool.name;
    this.address = pool.address;
    this.tvl = pool.tvl;
    this.apr = pool.apr;
    this.updateDate = pool.updated_at;
  }
}
