import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import puppeteer from 'puppeteer';

import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { getAgent } from '../../config/consts';
import BigNumber from 'bignumber.js';
import { ConfigService } from '@nestjs/config';

const POOLS = {
  'USDB/USD+': '0xf2d0a6699fea86fff3eb5b64cdc53878e1d19d6f',
  'USD+/WETH': '0x21f25b792d2e14378f93a4c3260a53f4a889e68d',
};

@Injectable()
export class ThrusterService {
  constructor(private configService: ConfigService) {}

  private readonly logger = new Logger(ThrusterService.name);

  async getPoolsData(): Promise<PoolData[]> {
    try {
      const pools: PoolData[] = [];

      const data = await axios.get('https://api.thruster.finance/analytics/top-pools?chainId=81457');
      const filteredArray = data.data.filter(pool => Object.values(POOLS).includes(pool.poolMetadata.poolAddress));
      console.log(filteredArray);
      filteredArray.forEach(item => {
        const poolData: PoolData = new PoolData();
        poolData.address = item.poolMetadata.poolAddress;
        poolData.name = item.poolMetadata.token0Symbol + '/' + item.poolMetadata.token1Symbol;

        poolData.tvl = new BigNumber(item.poolAnalytics.tvl).toFixed(2);

        poolData.apr = new BigNumber(item.poolAnalytics.apr24h).times(100).toFixed(2);
        poolData.chain = ChainType.BLAST;
        poolData.pool_version = (item.poolMetadata.poolVersion as string).toLowerCase();
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.THRUSTER}=========`);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      });
      return pools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.PANCAKE} pairs.`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    }
  }
}
