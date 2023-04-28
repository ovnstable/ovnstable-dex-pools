import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class RamsesService {
  private readonly logger = new Logger(RamsesService.name);

  BASE_API_URL = 'https://ramses-api-5msw7.ondigitalocean.app';
  METHOD_GET_PAIRS = 'pairs';
  async getPoolsData(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${this.METHOD_GET_PAIRS}`;

    const response = axios
      .get(url, {
        timeout: 80_000, // 80 sec
      })
      .then((data): PoolData[] => {
        //        console.log('Response data: ', data.data);
        const pools: PoolData[] = [];
        const poolsData = data.data;
        const keys = Object.keys(poolsData);
        let itemCount = 0;
        for (let i = 0; i < keys.length; i++) {
          const property = keys[i];
          const item = poolsData[property];
          if (
            item &&
            item.symbol &&
            AdaptersService.OVN_POOLS_NAMES.some((str) =>
              item.symbol.toLowerCase().includes(str),
            )
          ) {
            const poolData: PoolData = new PoolData();
            poolData.address = item.pair_address;
            poolData.name = item.symbol;
            poolData.decimals = item.decimals;
            poolData.tvl = item.tvl;
            poolData.apr = item.lp_apr;
            poolData.chain = ChainType.ARBITRUM;

            pools.push(poolData);
            this.logger.log(`=========${ExchangerType.RAMSES}=========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        }

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.RAMSES} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }
}
