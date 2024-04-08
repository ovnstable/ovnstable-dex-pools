import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { AdaptersService } from '../adapters.service';
import BN from 'bignumber.js';

@Injectable()
export class SwapBlastService {
  private readonly logger = new Logger(SwapBlastService.name);

  // get all api info / api data
  BASE_GRAPHQL_URL = 'https://api.studio.thegraph.com/query/67101/swapblast/version/latest/';
  BASE_URL = 'https://swapblast.finance/';
  REWARD_TOKEN = 'SBF';

  async getPoolsData(): Promise<PoolData[]> {
    const rateData = await fetch(
      'https://raw.githubusercontent.com/SwapBlasted/swapblast-lists/main/swapblast.farmslist.json',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    );
    const rates = await rateData.json();
    console.log(rates, '---rates');
    const query =
      'fragment PairFields on Pair {  id  trackedReserveETH  reserve0  reserve1  volumeUSD  reserveUSD  totalSupply  token0 {   symbol    id   decimals    derivedETH    __typename  }  token1 {   symbol   id    decimals   derivedETH    __typename  }  __typename} query pairs { pairs(    first: 1000   orderBy: trackedReserveETH    orderDirection: desc  ) {    ...PairFields    __typename  }}';
    const response = fetch(this.BASE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        operationName: 'pairs',
        query,
        variables: {},
      }),
    })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];
        const [responseBody] = await Promise.all([data.json()]);
        let itemCount = 0;
        const pairs = responseBody.data.pairs;
        let rewardTokenUsdPrice = '0';

        const rewardTokenPair = pairs.find(_ => {
          if (_.token0?.symbol === this.REWARD_TOKEN || _.token1?.symbol === this.REWARD_TOKEN) return _;
          return false;
        });

        if (rewardTokenPair) {
          rewardTokenUsdPrice = new BN(rewardTokenPair?.reserveUSD).div(2).div(rewardTokenPair?.reserve1).toFixed(6);
        }

        pairs.forEach(item => {
          if (
            item &&
            item.token0 &&
            item.token1 &&
            item.token0.symbol &&
            item.token1.symbol &&
            AdaptersService.OVN_POOLS_NAMES.some(str =>
              (item.token0.symbol + '/' + item.token1.symbol).toLowerCase().includes(str),
            )
          ) {
            const itemRateData = rates?.active?.find(_ => _.pair.toLowerCase() === item.id);
            const poolData: PoolData = new PoolData();
            poolData.address = item.id;
            poolData.name = item.token0.symbol + '/' + item.token1.symbol;
            poolData.decimals = 18;
            poolData.tvl = (item.reserve0 * 1 + item.reserve1 * 1).toString();

            poolData.apr = new BN(itemRateData?.rate ?? 0)
              .times(rewardTokenUsdPrice)
              .times(365)
              .div(item.reserveUSD)
              .times(100)
              .toFixed(2);

            poolData.apr = poolData.name === 'USD+/USDC+' ? new BN(poolData.apr).div(2).toFixed(2) : poolData.apr;

            poolData.chain = ChainType.BLAST;
            pools.push(poolData);
            this.logger.log(`=========${ExchangerType.SWAPBLAST}=========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        });

        return pools;
      })
      .catch(e => {
        const errorMessage = `Error when load ${ExchangerType.SWAPBLAST} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }
}
