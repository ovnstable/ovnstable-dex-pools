import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

const POOLS_MAP = {
  "velodrome-v2-ovn-usd+": {
    address: "0x844D7d2fCa6786Be7De6721AabdfF6957ACE73a0",
    symbol: "OVN/USD+",
    exchangerType: ExchangerType.VELODROME,
    chainType: ChainType.OPTIMISM,
  },

  "aerodrome-ovn-usd+": {
    address: "0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197",
    symbol: "OVN/USD+",
    exchangerType: ExchangerType.AERODROME,
    chainType: ChainType.BASE,
  }
}

@Injectable()
export class BeefylService {
  private readonly logger = new Logger(BeefylService.name);
  BASE_API_URL = 'https://api.beefy.finance';
  METHOD_GET_PAIRS = 'lps/breakdown';

  async getPoolsData(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${this.METHOD_GET_PAIRS}`;
    console.log("Load data by url:", url);

    const response = axios
      .get(url, {
        timeout: 80_000, // 80 sec
      })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];

        // console.log('Response data: ', data.data);
        const pairs = data.data;
        let itemCount = 0;
        // pairs = key - pool name, value - pool data
        for (const [key, value] of Object.entries(pairs)) {
          if (
            key &&
            AdaptersService.OVN_POOLS_NAMES.some((str) =>
              key.toLowerCase().includes(str),
            )
          ) {
            this.logger.log('Found ovn pool: ', key);

            const poolElement = POOLS_MAP[key];
            if (!poolElement) {
              this.logger.error(`Pool address not found in map. name: ${key} exType: ${ExchangerType.BEEFY}`)
              continue
            }

            this.logger.log('Found ovn pool: ', key, poolElement.address, poolElement.symbol, poolElement.exchangerType);
            this.logger.log('==================');
            this.logger.log("value:" , value);

            const poolData: PoolData = new PoolData();
            poolData.address = poolElement.address + '_' + poolElement.exchangerType;
            poolData.name = poolElement.symbol;
            poolData.decimals = null;
            poolData.tvl = (value['totalSupply'] * value['price']).toString();
            poolData.apr = await this.getApr(key);
            poolData.chain = poolElement.chainType;
            pools.push(poolData);
            this.logger.log(`========= ${ExchangerType.BEEFY} =========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        }

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.BEEFY} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }

  async getApr(poolName) {
    // https://api.beefy.finance/apy/breakdown
    const url = `${this.BASE_API_URL}/apy/breakdown`;
    console.log("Load data by url:", url);

    return await axios
      .get(url, {
        timeout: 80_000, // 80 sec
      })
      .then((data): string => {
        const pairs = data.data;
        let apr = null;
        for (const [key, value] of Object.entries(pairs)) {
          if (key === poolName) {
            apr = value['totalApy'];
            break;
          }
        }
        return String(apr * 100);
      });
  }
}
