import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from 'src/exchanger/models/inner/chain.type';

@Injectable()
export class WombatService {
  private readonly logger = new Logger(WombatService.name);

  BASE_GRAPHQL_URL =
    'https://api.thegraph.com/subgraphs/name/wombat-exchange/wombat-exchange';

  async getPoolsData(): Promise<PoolData[]> {
    const query =
      '\n      query{\n        assetsNow: assets {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n        assets24hAgo: assets (block:{number:27518248}) {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n      }';
    const response = fetch(this.BASE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {},
      }),
    })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];
        const [responseBody] = await Promise.all([data.json()]);
        //        console.log(responseBody);
        //        console.log(responseBody.data.assetsNow);
        const pairs = responseBody.data.assetsNow;
        let itemCount = 0;
        pairs.forEach((item) => {
          if (
            item &&
            item.symbol &&
            AdaptersService.OVN_POOLS_NAMES.some((str) =>
              item.symbol.toLowerCase().includes(str),
            )
          ) {
            const poolData: PoolData = new PoolData();
            poolData.address = item.id;
            poolData.name = item.symbol;
            poolData.decimals = item.decimals;
            poolData.tvl = item.totalTradeVolumeUSD;
            poolData.apr = item.apr;
            poolData.chain = ChainType.ARBITRUM;
            pools.push(poolData);
            this.logger.log(`=========${ExchangerType.WOMBAT}=========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        });

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.WOMBAT} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }
}
