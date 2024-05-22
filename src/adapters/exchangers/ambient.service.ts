import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { ConfigService } from '@nestjs/config';

import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';

const POOLS = [
  {
    name: 'USDB/USD+',
    token0: '0x4300000000000000000000000000000000000003',
    token1: '0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd',
    poolId: '420',
    chainId: '0x13e31', // 81457
    address: '0xaAaaaAAAFfe404EE9433EEf0094b6382D81fb958_usdb',
  },
  {
    name: 'ETH/USD+',
    token0: '0x0000000000000000000000000000000000000000',
    token1: '0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd',
    poolId: '420',
    chainId: '0x13e31', // 81457
    address: '0xaAaaaAAAFfe404EE9433EEf0094b6382D81fb958_eth',
  },
];

@Injectable()
export class AmbientService {
  constructor(private configService: ConfigService) {}

  private readonly logger = new Logger(AmbientService.name);

  private async fetchData(url: string, params: any) {
    try {
      const response = await axios.get(url, { params });
      return response.data.data;
    } catch (error) {
      throw new ExchangerRequestError(`Error fetching data: ${error.message}`);
    }
  }

  private calculateTvl(baseTvl: string, quoteTvl: string, lastPriceSwap: string) {
    const basePriceUSD = new BigNumber(lastPriceSwap).pow(-1);
    const baseTvlUSD = new BigNumber(baseTvl).div('10e+17').times(basePriceUSD);
    const quoteTvlUSD = new BigNumber(quoteTvl).div('10e+17');
    return baseTvlUSD.plus(quoteTvlUSD).toFixed(2);
  }

  private async fetchPoolData(item: any) {
    const poolData = new PoolData();
    const [poolStats, poolApr] = await Promise.all([
      this.fetchData('https://ambindexer.net/blast-gcgo/pool_stats', {
        base: item.token0,
        quote: item.token1,
        poolIdx: item.poolId,
        chainId: item.chainId,
      }),
      this.fetchData('https://ambindexer.net/blast-gcgo/pool_position_apy_leaders', {
        base: item.token0,
        quote: item.token1,
        poolIdx: item.poolId,
        chainId: item.chainId,
        sortByAPY: 'true',
        n: '1',
      }),
    ]);
    poolData.address = item.address;
    poolData.name = item.name;
    poolData.tvl = this.calculateTvl(poolStats.baseTvl, poolStats.quoteTvl, poolStats.lastPriceSwap);
    poolData.apr = new BigNumber(poolApr[0].aprEst).times(100).toFixed(2);
    poolData.chain = ChainType.BLAST;
    poolData.pool_version = 'v2';
    return poolData;
  }

  async getPoolsData(): Promise<PoolData[]> {
    try {
      const poolsPromises = POOLS.map(item => this.fetchPoolData(item));
      const pools = await Promise.all(poolsPromises);
      pools.forEach(pool => {
        this.logger.log(`=========${ExchangerType.AMBIENT}=========`);
        this.logger.log('Found ovn pool: ', pool);
        this.logger.log('==================');
      });
      return pools;
    } catch (error) {
      const errorMessage = `Error when loading ${ExchangerType.AMBIENT} pairs: ${error.message}`;
      this.logger.error(errorMessage);
      throw new ExchangerRequestError(errorMessage);
    }
  }
}
