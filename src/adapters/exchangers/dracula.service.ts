import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import fetch from 'node-fetch';
import axios from 'axios';

@Injectable()
export class DraculaService {
  private readonly logger = new Logger(DraculaService.name);
  BASE_API_URL = 'https://api-dex.draculafi.xyz';
  METHOD_GET_PAIRS = 'pairs';

  COINGECKO_API_URL =
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum%2Cusd-coin%2Cusd&vs_currencies=usd&include_market_cap=false&include_24hr_vol=false&include_24hr_change=false&include_last_updated_at=false&precision=full';

  async getPoolsData(): Promise<PoolData[]> {
    try {
      const coinGeckoResponse = await fetch(this.COINGECKO_API_URL);
      if (!coinGeckoResponse.ok) {
        throw new Error('Error: ' + coinGeckoResponse.status);
      }

      const coinGeckoData = await coinGeckoResponse.json();
      const ethereumPrice = coinGeckoData.ethereum.usd;
      const usdCoinPrice = coinGeckoData['usd-coin'].usd;
      const usdPrice = coinGeckoData.usd.usd;

      const url = `${this.BASE_API_URL}/${this.METHOD_GET_PAIRS}`;
      console.log('Load data by URL:', url);

      const response = await axios.get(url, {
        timeout: 80_000, // 80 sec
      });

      const pools: PoolData[] = [];
      const pairs = response.data.pairs;
      let itemCount = 0;

      pairs.forEach(item => {
        if (
          item &&
          item.symbol &&
          AdaptersService.OVN_POOLS_NAMES.some(str => item.symbol.toLowerCase().includes(str))
        ) {
          const poolData: PoolData = new PoolData();

          poolData.address = item.address;
          poolData.name = item.symbol;
          poolData.decimals = item.decimals;
          if (item.symbol === 'vAMM-WETH/USD+') {
            poolData.tvl = (item.reserve0 * ethereumPrice + item.reserve1 * 1).toString();
          } else {
            poolData.tvl = (item.reserve0 * usdCoinPrice + item.reserve1 * 1).toString();
          }
          poolData.apr = null;
          poolData.chain = ChainType.ZKSYNC;

          pools.push(poolData);

          this.logger.log(`========= ${ExchangerType.DRACULA} =========`);
          itemCount++;
          this.logger.log('Found ovn pool #: ', itemCount);
          this.logger.log('Found ovn pool: ', poolData);
          this.logger.log('==================');
        }
      });

      return pools;
    } catch (error) {
      const errorMessage = `Error when load ${ExchangerType.DRACULA} pairs.`;
      this.logger.error(errorMessage, error);
      throw new ExchangerRequestError(errorMessage);
    }
  }
}
