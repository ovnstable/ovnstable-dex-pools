import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from 'src/exchanger/models/inner/chain.type';

@Injectable()
export class CronosService {
  private readonly logger = new Logger(CronosService.name);

  // get all api info / api data
  // https://api.thegraph.com/subgraphs/name/wombat-exchange/wombat-exchange-arbone/graphql?query=%0A%7B%0A++__schema+%7B%0A++++types+%7B%0A++++++name%0A++++++fields+%7B%0A++++++++name%0A++++++++description%0A++++++%7D%0A++++%7D%0A++%7D%0A%7D

  BASE_GRAPHQL_URL = 'https://api.thegraph.com/subgraphs/name/xliee/chronos';

  async getPoolsData(): Promise<PoolData[]> {
    const query =
      'query Query { pairs(first:1000) { id, reserve0, reserve1, token0 { id, name, decimals }, token1 { id, name, decimals }, } }';

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
        console.log(responseBody);
        console.log(responseBody.data.pairs);
        let itemCount = 0;
        const pairs = responseBody.data.pairs;
        pairs.forEach((item) => {
          if (
            (item &&
              item.token0 &&
              item.token1 &&
              AdaptersService.OVN_POOLS_NAMES.some((str) =>
                item.token0.name.toLowerCase().includes(str),
              )) ||
            AdaptersService.OVN_POOLS_NAMES.some((str) =>
              item.token1.name.toLowerCase().includes(str),
            )
          ) {
            console.log('Found!');
            console.log(item);
            const poolData: PoolData = new PoolData();
            poolData.address = item.id;
            poolData.name = item.token0.name + '/' + item.token1.name;
            poolData.decimals = item.token0.decimals;
            poolData.tvl = (item.reserve0 * 1 + item.reserve1 * 1).toString();
            poolData.apr = this.getCalculatedApr(item);
            poolData.chain = ChainType.ARBITRUM;
            pools.push(poolData);
            this.logger.log(`========= ${ExchangerType.CRONOS} =========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        });

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.CRONOS} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }

  getCalculatedApr(item): string {
//    const tvlUSD = item.reserve0 * 1 + item.reserve1 * 1;
//    const lp100 = 100 / (tvlUSD / item.totalSupply);
//
//    const chrPriceUSD = 0.2348228092177886;
//
//    totalWeight = parseFloat(
//      getParsedTokenBalance(pair.gauge_total_weight, 18, 18),
//    );
//    emissionsPerSecond = pair.emissions;
//
//    apr = totalWeight
//      ? (lp100 / totalWeight) * emissionsPerSecond * chrPriceUSD * 31536000
//      : 0;
//    maxAPR = apr * 2;

    return (0).toString();
  }
}
