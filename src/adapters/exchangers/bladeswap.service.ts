import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import puppeteer from 'puppeteer';
import { getAgent } from '../../config/consts';
import BigNumber from 'bignumber.js';

const POOLS_MAP = {
  // pool name: pool address
  'USD+/ETH': '0x79fDD888414eb48f6510934F2E2862D5D6492DeD',
  'USDB/USD+': '0x7048227a2E41aBDf3fc5f7Eb6d7Aee8B7e8FC576',
};

@Injectable()
export class BladeSwapService {
  private readonly logger = new Logger(BladeSwapService.name);

  BASE_API_URL = 'https://app.bladeswap.xyz/liquidity';

  async getPoolsData(): Promise<PoolData[]> {
    const url = this.BASE_API_URL;

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.BLADESWAP);

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
      await page.waitForSelector(
        '#root > div > div.css-1vlo2az > div > div.mantine-hr6aor.mantine-AppShell-body > main > div.mantine-1fr50if > div > div > div.css-b2gwxu > div > div > div.mantine-1m3tpc2 > table > tbody > tr:nth-child(1) > td.mantine-1uv9mpc > div > div.mantine-1fr50if',
      );
      console.log('sdcndslkcdslkncdlk');

      const poolRow = await page.$$eval(
        '#root > div > div.css-1vlo2az > div > div.mantine-hr6aor.mantine-AppShell-body > main > div.mantine-1fr50if > div > div > div.css-b2gwxu > div > div > div.mantine-1m3tpc2 > table > tbody > tr',
        elements => {
          return elements.map(tr => {
            const name = tr.querySelector('td:nth-child(1)').textContent.replace('VOLATILE', '').replace('STABLE', '');
            const apr = tr.querySelector('td:nth-child(4)').textContent.replace('%', '');
            const tvl = tr.querySelector('td:nth-child(5)').textContent.replace('$', '').replace(',', '');
            return {
              name,
              apr,
              tvl,
            };
          });
        },
      );

      // Display the extracted data
      const pools: PoolData[] = [];
      let itemCount = 0;

      poolRow
        .filter(pool => Object.keys(POOLS_MAP).includes(pool.name))
        .forEach(pool => {
          const poolData: PoolData = new PoolData();
          poolData.address = POOLS_MAP[pool.name];
          poolData.name = pool.name;
          poolData.decimals = null;
          poolData.tvl = pool.tvl;
          poolData.apr = pool.apr;
          poolData.chain = ChainType.BLAST;
          pools.push(poolData);
          this.logger.log(`=========${ExchangerType.BLADESWAP}=========`);
          itemCount++;
          this.logger.log('Found ovn pool #: ', itemCount);
          this.logger.log('Found ovn pool: ', poolData);
          this.logger.log('==================');
        });

      return pools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.AERODROME} pairs. url: ${url}`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug('Browser is close. ' + ExchangerType.AERODROME);
      await browser.close();
    }
  }
}
