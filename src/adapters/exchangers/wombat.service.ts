import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class WombatService {
  private readonly logger = new Logger(WombatService.name);

  // get all api info / api data
  // https://api.thegraph.com/subgraphs/name/wombat-exchange/wombat-exchange-arbone/graphql?query=%0A%7B%0A++__schema+%7B%0A++++types+%7B%0A++++++name%0A++++++fields+%7B%0A++++++++name%0A++++++++description%0A++++++%7D%0A++++%7D%0A++%7D%0A%7D

  ARBITRUM_BASE_GRAPHQL_URL =
    'https://api.thegraph.com/subgraphs/name/wombat-exchange/wombat-exchange-arbone';
  ARBITRUM_TOKENS_QUERY = '{"query":"\n      query{\n        assetsNow: assets {\nid\nsymbol\ntotalTradeVolumeUSD\ntvl\nwomBaseApr\navgBoostedApr\ntotalBonusTokenApr}\n        assets24hAgo: assets (block:{number:91866496}) {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n      }"}'

  BSC_BASE_GRAPHQL_URL =
    'https://api.thegraph.com/subgraphs/name/wombat-exchange/wombat-exchange-bsc-develop';
  BSC_TOKENS_QUERY = '{"query":"\n      query{\n        assetsNow: assets {\nid\nsymbol\ntotalTradeVolumeUSD\ntvl\nwomBaseApr\navgBoostedApr\ntotalBonusTokenApr}\n        assets24hAgo: assets (block:{number:28311702}) {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n      }"}'

  async getPoolsData(): Promise<PoolData[]> {
    const arbitrumPoolsData = await this.getPools(this.ARBITRUM_BASE_GRAPHQL_URL, (91866496).toString(), ChainType.ARBITRUM);
    const bscPoolsData = await this.getPools(this.BSC_BASE_GRAPHQL_URL, (28311702).toString(), ChainType.BSC);
    return [...arbitrumPoolsData, ...bscPoolsData];
  }

  // arbitrum
  //  get block arbitrum
  //  https://api.thegraph.com/subgraphs/name/wombat-exchange/arbitrum-one-block 91866496
  //  {"query":"\n    {\n      blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: {timestamp_lte: 1684393459}) {\n        number\n        timestamp\n      }\n    }\n    "}

  // get tokens
  //  https://api.thegraph.com/subgraphs/name/wombat-exchange/wombat-exchange-arbone
  //  {"query":"\n      query{\n        assetsNow: assets {\nid\nsymbol\ntotalTradeVolumeUSD\ntvl\nwomBaseApr\navgBoostedApr\ntotalBonusTokenApr}\n        assets24hAgo: assets (block:{number:91866496}) {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n      }"}


//    bsc
//  get blocks
  //  https://api.thegraph.com/subgraphs/name/matthewlilley/bsc-blocks  28311702
  // {"query":"\n    {\n      blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: {timestamp_lte: 1684393638}) {\n        number\n        timestamp\n      }\n    }\n    "}

  // get tokens
//  https://api.thegraph.com/subgraphs/name/wombat-exchange/wombat-exchange-bsc-develop
  // {"query":"\n      query{\n        assetsNow: assets {\nid\nsymbol\ntotalTradeVolumeUSD\ntvl\nwomBaseApr\navgBoostedApr\ntotalBonusTokenApr}\n        assets24hAgo: assets (block:{number:28311702}) {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n      }"}

//  '\n      query{\n        assetsNow: assets {\nid\nsymbol\ntotalTradeVolumeUSD\ntvl\nwomBaseApr\navgBoostedApr\ntotalBonusTokenApr}\n        assets24hAgo: assets (block:{number:91549963}) {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n      }';
  async getPools(url: string, blockNumber: string, chainType: ChainType): Promise<PoolData[]> {
    {
      const query =
      '\n      query{\n        assetsNow: assets {\nid\nsymbol\ntotalTradeVolumeUSD\ntvl\nwomBaseApr\navgBoostedApr\ntotalBonusTokenApr}\n        assets24hAgo: assets (block:{number:' + blockNumber + '}) {\n          id\n          symbol\n          totalTradeVolumeUSD\n        }\n      }';


      const response = fetch(url, {
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
//                console.log(responseBody);
//                console.log(responseBody.data.assetsNow);
        const pairs = responseBody.data.assetsNow;
        const pairsTwo = responseBody.data.assets24hAgo;
        let itemCount = 0;
        pairs.forEach((item) => {
          if (
            item &&
            item.symbol &&
            AdaptersService.OVN_POOLS_NAMES.some((str) =>
              item.symbol.toLowerCase().includes(str),
              )
              ) {
            console.log('Found!');
            console.log(item);
            const poolData: PoolData = new PoolData();
            poolData.address = item.id;
            poolData.name = item.symbol;
            poolData.decimals = item.decimals;
            poolData.tvl = item.tvl;
            poolData.apr = this.getCalculatedApr(item);
            poolData.chain = chainType;
            pools.push(poolData);
            this.logger.log(`========= ${ExchangerType.WOMBAT} ${chainType} =========`);
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

  getCalculatedApr(item): string {
    return (
      item.avgBoostedApr * 100 +
      item.womBaseApr * 100 +
      item.totalBonusTokenApr * 100
    ).toString();
  }
}
