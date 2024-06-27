import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { getAgent } from '../../config/consts';
import BigNumber from 'bignumber.js';

type mapEntity = {
  [key: string]: {
    address: string;
    pool_version: string;
  };
};

const USD_PLUS_MAP = {
  // pool name: pool address
  'sAMM-FRAX/USD+': { address: '0xD330841EF9527E3Bd0abc28a230C7cA8dec9423B', pool_version: 'v2' },
  'sAMM-USD+/DAI+': { address: '0x667002F9DC61ebcBA8Ee1Cbeb2ad04060388f223', pool_version: 'v2' },
  'sAMM-USDC/USD+': { address: '0x46e1B51e07851301f025ffeA506b140dB80a214A', pool_version: 'v2' },
  'sAMM-USD+/USDC.e': { address: '0xd95E98fc33670dC033424E7Aa0578D742D00f9C7', pool_version: 'v2' },
  'vAMM-OVN/USD+': { address: '0x844D7d2fCa6786Be7De6721AabdfF6957ACE73a0', pool_version: 'v2' },
  'CL100-WETH/USD+': { address: '0x9dA9D8dCdAC3Cab214d2bd241C3835B90aA8fFdE', pool_version: 'v3' },
  'CL200-OP/USD+': { address: '0x995eB8f1A44824E58352E6F83d4d64801243468D', pool_version: 'v3' },
  'CL1-USDC/USD+': { address: '0xfd5F39c74E63f1dacE336350afDF11E85BBD56F4', pool_version: 'v3' },
};

@Injectable()
export class VelodromeService {
  private readonly logger = new Logger(VelodromeService.name);

  BASE_API_URL = 'https://velodrome.finance/liquidity';

  async getPoolsData(): Promise<PoolData[]> {
    const usdPlusPools = await this.getPools('?query=usd%2B&filter=all', USD_PLUS_MAP);

    return [...usdPlusPools];
  }

  async getPools(queryString: string, poolsMap: mapEntity): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${queryString}`;

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.VELODROME);

    try {
      // Create a new page
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      );
      // Set a default timeout of 20 seconds
      await page.setDefaultTimeout(60000);

      // Navigate to the SPA
      await page.goto(url);
      const markerOfLoadingIsFinish = '.justify-between.bg-white.p-5.text-sm.text-gray-600';

      // Wait for the desired content to load
      await page.waitForSelector(markerOfLoadingIsFinish);

      const data = await page.$$eval('.space-y-1\\.5.shadow-sm.rounded-lg > div', elelents => {
        return elelents.map(el => {
          const nameElement = el.querySelector('div:nth-child(1) strong');
          const aprElement = el.querySelector('div:nth-child(2) span.tracking-wider');
          const tvlElement = el.querySelector('div:nth-child(1) > a > div:nth-child(2)');

          const name = nameElement ? nameElement.textContent : '';
          const aprStr = aprElement ? aprElement.textContent : '0';
          const tvlStr = tvlElement ? tvlElement.textContent : '0';

          return {
            name,
            tvl: tvlStr.replace('TVL  ~$', '').replace(/,/g, ''),
            apr: aprStr.replace('%', '').replace(/,/g, ''),
          };
        });
      });

      const pools: PoolData[] = [];
      let itemCount = 0;

      for (const [key, value] of Object.entries(poolsMap)) {
        const item = data.find(el => el.name === key);
        if (!item) {
          this.logger.error(`Pool not found in map. name: ${key} exType: ${ExchangerType.VELODROME}`);
          continue;
        }

        const poolData: PoolData = new PoolData();
        poolData.address = value.address;
        poolData.name = key;
        poolData.decimals = null;
        poolData.tvl = BigNumber(item.tvl).toFixed(2);
        poolData.apr = BigNumber(item.apr).toFixed(2);
        poolData.chain = ChainType.OPTIMISM;
        poolData.pool_version = value.pool_version;
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.VELODROME}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      }

      return pools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.VELODROME} pairs. url: ${url}`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug('Browser is close. ' + ExchangerType.VELODROME);
      await browser.close();
    }
  }
}
