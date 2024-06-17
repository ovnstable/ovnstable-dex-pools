import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import BigNumber from 'bignumber.js';

@Injectable()
export class LynexService {
  private readonly logger = new Logger(LynexService.name);

  // get all api info / api data
  BASE_GRAPHQL_URL = 'https://graph-query.linea.build/subgraphs/name/cryptoalgebra/analytics';
  BASE_URL = 'https://api.lynex.fi/api/v1/fusions';

  async getPoolsData(): Promise<PoolData[]> {
    const poolsToLoad = [
      {
        address: '0x58aacbccaec30938cb2bb11653cad726e5c4194a',
        token0: 'USDC',
        token1: 'USD+',
        pool_version: 'v2',
      },
      {
        address: '0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91',
        token0: 'USDT+',
        token1: 'USD+',
        pool_version: 'v2',
      },
      {
        address: '0x6f501662a76577fbb3bb230be5e8e69d41d8c711',
        token0: 'FLY',
        token1: 'USD+',
        pool_version: 'v3',
      },
      {
        address: '0xbe23da11fbf9da0f7c13ea73a4bb511b9bc00177',
        token0: 'USDT+',
        token1: 'USDT',
        pool_version: 'v2',
      },
      {
        address: '0x2bee5c1633222f8478100bf6ab6cab6956bdcfe0',
        token0: 'USDC',
        token1: 'USD+',
        pool_version: 'v3',
      },
      {
        address: '0x66b5847bf79629c777a3897da98ccc284d15e33a',
        token0: 'USD+',
        token1: 'WETH',
        pool_version: 'v3',
      },
    ];

    const response = fetch(this.BASE_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];
        const [responseBody] = await Promise.all([data.json()]);
        const apiPoolsData = responseBody.data;

        apiPoolsData.forEach(item => {
          const poolData: PoolData = new PoolData();
          const poolMainData = poolsToLoad.find(_ => _.address === item.address);
          if (!poolMainData) return;
          console.log(poolMainData);
          poolData.address = item.address;
          poolData.name = poolMainData.token0 + '/' + poolMainData.token1;
          poolData.decimals = 18;
          poolData.tvl = new BigNumber(item.gauge.tvl).toFixed(2);

          poolData.apr = `${item?.gauge?.apr}` ?? '0';
          poolData.chain = ChainType.LINEA;
          poolData.pool_version = poolMainData.pool_version;
          pools.push(poolData);
          this.logger.log(`=========${ExchangerType.LYNEX}=========`);
          this.logger.log('Found ovn pool: ', poolData);
          this.logger.log('==================');
        });

        console.log(pools, 'p---POOOLS');
        return pools;
      })
      .catch(e => {
        const errorMessage = `Error when load ${ExchangerType.LYNEX} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }
}
