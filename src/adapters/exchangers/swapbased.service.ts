import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { AdaptersService } from '../adapters.service';
import BN from 'bignumber.js';

const POOLS = {
  'USD+/DAI+': '0x164bc404c64fa426882d98dbce9b10d5df656eed',
  'USDC+/USD+': '0xc3cb7e40b78427078e2cb0c5da0bf7a0650f89f8',
  'USDbC/USD+': '0x282f9231e5294e7354744df36461c21e0e68061c',
};

@Injectable()
export class SwapBasedService {
  private readonly logger = new Logger(SwapBasedService.name);

  // get all api info / api data
  BASE_GRAPHQL_URL = 'https://api.thegraph.com/subgraphs/name/chimpydev/swapbase';
  BASE_URL = 'https://swapbased.finance/#/farm';
  REWARD_TOKEN = 'COIN';

  async getPoolsData(): Promise<PoolData[]> {
    const rateData = await fetch(
      'https://raw.githubusercontent.com/chimpydev/swapbase-lists/main/swapbased.farmslist.json',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    );
    const rates = await rateData.json();
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
        console.log(responseBody.data);
        const pairs = responseBody.data.pairs;
        let rewardTokenUsdPrice = '0';

        const rewardTokenPair = pairs.find(_ => {
          if (_.token0?.symbol === this.REWARD_TOKEN || _.token1?.symbol === this.REWARD_TOKEN) return _;
          return false;
        });

        if (rewardTokenPair) {
          rewardTokenUsdPrice = new BN(rewardTokenPair?.reserveUSD).div(2).div(rewardTokenPair?.reserve0).toFixed(6);
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
            ) &&
            rates.active.some(pool => item.id.toLowerCase() === pool.pair.toLowerCase())
          ) {
            const itemRateData = rates?.active?.find(_ => _.pair.toLowerCase() === item.id);
            const poolData: PoolData = new PoolData();
            poolData.address = item.id;
            poolData.name = item.token0.symbol + '/' + item.token1.symbol;
            poolData.decimals = 18;
            poolData.tvl = (item.reserve0 * 1 + item.reserve1 * 1).toString();

            console.log(itemRateData);

            poolData.apr = new BN(itemRateData?.rate ?? 0)
              .times(rewardTokenUsdPrice)
              .times(365)
              .div(poolData.tvl)
              .times(100)
              .toFixed(2);

            poolData.chain = ChainType.BASE;
            poolData.pool_version = 'v2';
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
