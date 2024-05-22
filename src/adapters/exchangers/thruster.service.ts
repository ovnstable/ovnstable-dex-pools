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

  async buildQuery(poolAddress: string) {
    const query = `
    query {
        pairMetadata (pairId:"${poolAddress}:81457" quoteToken:token0) {
            pairAddress
            price
            volume24
            fee
            token0 {
                symbol
                price
                pooled
            }
            token1 {
                symbol
                price
                pooled
            }
        }
      }
    `;

    const data = await axios.post(
      'https://graph.defined.fi/graphql',
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.configService.get<string>('DEFINED_API_KEY'),
        },
      },
    );

    return data.data.data;
  }

  async getPoolsData(): Promise<PoolData[]> {
    try {
      const pools: PoolData[] = [];

      const filteredArray = await Promise.all(Object.values(POOLS).map(poolAddress => this.buildQuery(poolAddress)));
      filteredArray.forEach(item => {
        const poolData: PoolData = new PoolData();
        poolData.address = item.pairMetadata.pairAddress;
        poolData.name = item.pairMetadata.token0.symbol + '/' + item.pairMetadata.token1.symbol;

        const token0USD = new BigNumber(item.pairMetadata.token0.pooled).times(item.pairMetadata.token0.price);
        const token1USD = new BigNumber(item.pairMetadata.token1.pooled).times(item.pairMetadata.token1.price);
        poolData.tvl = new BigNumber(token0USD).plus(token1USD).toFixed(2);

        const fees24 = new BigNumber(item.pairMetadata.fee)
          .div(10000) // 500 -> 0.05%
          .div(100)
          .times(item.pairMetadata.volume24);
        poolData.apr = fees24.times(365).div(poolData.tvl).times(100).toFixed(2);
        poolData.chain = ChainType.BLAST;
        poolData.pool_version = 'v2';
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
