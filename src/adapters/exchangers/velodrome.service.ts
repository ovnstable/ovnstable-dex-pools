import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import axios from 'axios';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { AdaptersService } from '../adapters.service';
import { ChainType } from '../../exchanger/models/inner/chain.type';

@Injectable()
export class VelodromeService {
  private readonly logger = new Logger(VelodromeService.name);

  BASE_API_URL = 'https://api.velodrome.finance/api';
  API_VERSION = 'v1';
  METHOD_GET_PAIRS = 'pairs';
  async getPoolsData(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${this.API_VERSION}/${this.METHOD_GET_PAIRS}`;

    const response = axios
      .get(url, {
        headers: this.getHeaders(),
        timeout: 80_000, // 80 sec
      })
      .then((data): PoolData[] => {
        //        console.log('Response data: ', data.data);
        const pools: PoolData[] = [];
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
            poolData.apr = item.apr;
            poolData.chain = ChainType.OPTIMISM;
            pools.push(poolData);
            this.logger.log(`=========${ExchangerType.VELODROME}=========`);
            itemCount++;
            this.logger.log('Found ovn pool #: ', itemCount);
            this.logger.log('Found ovn pool: ', poolData);
            this.logger.log('==================');
          }
        });

        return pools;
      })
      .catch((e) => {
        const errorMessage = `Error when load ${ExchangerType.VELODROME} pairs. url: ${url}`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }

  private getHeaders() {
    return {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      //      'accept-encoding': 'gzip, deflate, br',
      //      'accept-language': 'ru-RU,ru;q=0.8',
      //      'cache-control': 'max-age=0',
      //      'sec-ch-ua': '"Chromium";v="112", "Brave";v="112", "Not:A-Brand";v="99"',
      //      'sec-ch-ua-mobile': '?0',
      //      'sec-ch-ua-platform': '"macOS"',
      //      'sec-fetch-dest': 'document',
      //      'sec-fetch-mode': 'navigate',
      //      'sec-fetch-site': 'none',
      //      'sec-fetch-user': '?1',
      //      'sec-gpc': '1',
      //      'upgrade-insecure-requests': '1',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    };
  }
}
