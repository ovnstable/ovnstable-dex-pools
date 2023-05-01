import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class ThenaService {
  private readonly logger = new Logger(ThenaService.name);

  BASE_API_URL = 'https://api.thena.fi/api';
  API_VERSION = 'v1';
  METHOD_GET_PAIRS = 'pools';
  async getPoolsData(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${this.API_VERSION}/${this.METHOD_GET_PAIRS}`;

    const response = axios
      .get(url, {
        timeout: 80_000, // 80 sec
      })
      .then((data): PoolData[] => {
        const pools: PoolData[] = [];
        //        console.log('Response data: ', data.data);
        const pairs = data.data.data;
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
            poolData.address = item.address;
            poolData.name = item.symbol;
            poolData.decimals = item.decimals;
            poolData.tvl = item.tvl;
            poolData.apr = item.gauge.apr;
            poolData.chain = ChainType.BSC;
            pools.push(poolData);
            this.logger.log(`========= ${ExchangerType.THENA} =========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        });

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.THENA} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }
}
