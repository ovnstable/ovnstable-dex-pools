import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from 'src/exchanger/models/inner/chain.type';

@Injectable()
export class VesyncService {
  private readonly logger = new Logger(VesyncService.name);

  BASE_API_URL = 'https://api.vesync.finance';
  METHOD_GET_PAIRS = 'pairs';
  
  async getPoolsData(): Promise<PoolData[]> {
    const zkSyncPools = await this.getPools(
      this.BASE_API_URL,
      ChainType.ZKSYNC,
    );

    return [...zkSyncPools];
  }

  async getPools(
    baseApiUrl: string,
    chainType: ChainType,
  ): Promise<PoolData[]> {
    const url = `${baseApiUrl}/${this.METHOD_GET_PAIRS}`;

    const response = axios
      .get(url, {
        timeout: 80_000, // 80 sec
      })
      .then((data): PoolData[] => {
//        console.log('Response data: ', data.data);
        const pools: PoolData[] = [];
        const pairs = data.data;
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
            poolData.decimals = item.token1 ? item.token1.decimals : 0;
            poolData.tvl = item.tvl;
            poolData.apr = item.apr;
            poolData.chain = chainType;
            pools.push(poolData);
            this.logger.log(
              `========= ${ExchangerType.VESYNC} ${chainType} =========`,
            );
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        });

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.VESYNC} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }
}
