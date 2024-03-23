import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';

const POOLS_ARR = [{
  address: "0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306",
  pair: "USDC/USD+"
}]


@Injectable()
export class SyncswapService {
  private readonly logger = new Logger(SyncswapService.name);

  // BASE_API_URL = 'https://aerodrome.finance/liquidity';
  // METHOD_GET_PAIRS = '?query=usd%2B&filter=all';

    async getPoolsData(): Promise<PoolData[]> {
      const pools: PoolData[] = [];

      POOLS_ARR.forEach((item) => {
          const poolData: PoolData = new PoolData();
          poolData.address = item.address;
          poolData.name = item.pair;
          poolData.decimals = 18;
          // todo tvl + apr
          poolData.tvl = "68765";
          poolData.apr = "43";

          poolData.chain = ChainType.ZKSYNC;
          pools.push(poolData);
          this.logger.log(`=========${ExchangerType.SYNCSWAP}=========`);
          this.logger.log("Found ovn pool: ", poolData);
          this.logger.log("==================");
      });

      return pools
  }
}
