import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import puppeteer from 'puppeteer';
import { getAgent } from '../../config/consts';
import BigNumber from 'bignumber.js';

type mapEntity = {
  [key: string]: {
    address: string;
    pool_version: string;
  };
};

const POOLS_MAP = {
  // pool name: pool address
  'USD+/ETH': { address: '0xa8A502ACF4084B8D38362E9F620C689CB4D2EB89', pool_version: 'v3' },
  'USD+/USDT': { address: '0x37570DB173beF23F6924beaE3CD960b41AB6AD74', pool_version: 'v3' },
};

@Injectable()
export class TraderJoeService {
  private readonly logger = new Logger(TraderJoeService.name);

  BASE_API_URL = 'https://traderjoexyz.com/arbitrum/pool';

  async getPoolsData(): Promise<PoolData[]> {
    const data = await this.getPools();

    return data;
  }

  async getPools(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}`;

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.TRADERJOE);

    try {
      // Create a new page
      const page = await browser.newPage();
      await page.setCacheEnabled(false);
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      );
      // Set a default timeout of 20 seconds
      await page.setDefaultTimeout(60000);

      // Navigate to the SPA
      await page.goto(url);

      // Wait for the desired content to load
      await page.waitForSelector('tr[aria-label="USD+-WETH liquidity pool"]');

      const data = await page.$$eval('tbody > tr', elelents => {
        return elelents.map(el => {
          const nameStr = el.querySelector('td:nth-child(1) p').textContent;
          const aprStr = el.querySelector('td:nth-child(7)').textContent;
          const tvlStr = el.querySelector('td:nth-child(3)').textContent;

          return {
            name: nameStr.replace(' - ', '/'),
            tvl: tvlStr.replace('$', '').replace(/,/g, '').replace(/\s/g, ''),
            apr: aprStr.replace('%', '').replace(/,/g, ''),
          };
        });
      });

      console.log(data);

      const pools: PoolData[] = [];
      let itemCount = 0;

      for (const [key, value] of Object.entries(POOLS_MAP)) {
        const item = data.find(el => el.name === key);
        if (!item) {
          this.logger.error(`Pool not found in map. name: ${key} exType: ${ExchangerType.TRADERJOE}`);
          continue;
        }

        const poolData: PoolData = new PoolData();
        poolData.address = value.address;
        poolData.name = key;
        poolData.tvl = BigNumber(item.tvl).toFixed(2);
        poolData.apr = BigNumber(item.apr).toFixed(2);
        poolData.chain = ChainType.ARBITRUM;
        poolData.pool_version = value.pool_version;
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.TRADERJOE}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      }

      return pools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.TRADERJOE} pairs. url: ${url}`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug('Browser is close. ' + ExchangerType.TRADERJOE);
      await browser.close();
    }
  }
}
