import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import puppeteer from 'puppeteer';

import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { getAgent } from '../../config/consts';
import BigNumber from 'bignumber.js';

const POOLS_MAP = ['dyson-base-aerodrome-ovn-usd+'];

@Injectable()
export class DysonService {
  private readonly logger = new Logger(DysonService.name);
  private readonly VAULT_API = 'https://api2.dyson.money/vaults';

  async getPoolsData(): Promise<PoolData[]> {
    const basePools = await this.loadPoolsData(ChainType.BASE);
    return [...basePools];
  }

  async loadPoolsData(chainType: ChainType): Promise<PoolData[]> {
    try {
      const response = await axios.get(this.VAULT_API, { timeout: 80_000 });
      const pools: PoolData[] = [];
      const pairs = response.data.base;

      let itemCount = 0;
      POOLS_MAP.forEach(poolTitle => {
        if (pairs[poolTitle]) {
          const item = pairs[poolTitle];
          const poolData = new PoolData();

          poolData.address = item.address;
          poolData.name = item.composition.map((c: any) => c.symbol).join('/');
          poolData.tvl = new BigNumber(item.metrics.tvl.vault.USDBalance ?? 0).toFixed(2);
          poolData.apr = new BigNumber(item.metrics.rewardRate.rewardRate * 100 ?? 0).toFixed(2);
          poolData.chain = chainType;

          pools.push(poolData);

          this.logger.log(`========= ${ExchangerType.DYSON} =========`);
          itemCount++;
          this.logger.log('Found ovn pool #: ', itemCount);
          this.logger.log('Found ovn pool: ', poolData);
          this.logger.log('==================');
        } else {
          console.log('Pool not found: ', poolTitle);
        }
      });

      return pools;
    } catch (error) {
      const errorMessage = `Error when load ${ExchangerType.DYSON} pairs.`;
      this.logger.error(errorMessage, error);
      throw new ExchangerRequestError(errorMessage);
    }
  }
}
