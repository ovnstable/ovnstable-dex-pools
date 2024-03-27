import { PoolData } from './dto/pool.data.dto';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import puppeteer from 'puppeteer';
import { getAgent } from 'src/config/consts';
import { ExchangerRequestError } from 'src/exceptions/exchanger.request.error';
import { Injectable, Logger } from '@nestjs/common';

const POOLS_ARR = [
  {
    address: '0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306',
    pair: 'USDC/USD+',
  },
];

const TRY_COUNT = 30;
const TIME_FOR_TRY = 5_000;

@Injectable()
export class SyncswapService {
  private readonly logger = new Logger(SyncswapService.name);

  async getPoolsData(): Promise<PoolData[]> {
    const pools: PoolData[] = [];

    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.SYNCSWAP);

    try {
      for (const item of POOLS_ARR) {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        );

        page.setDefaultTimeout(20000);

        const url = `https://syncswap.xyz/pool/${item.address}`;

        await page.goto(url);

        try {
          await page.waitForSelector('.arrow > .pointer', { timeout: 5000 });
          const cross = await page.$('.arrow > .pointer');
          if (cross) {
            await cross.click();
          }
        } catch (e) {}

        let stats = [];
        let isLoaded = false;
        for (let i = 0; i < TRY_COUNT; i++) {
          await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));
          stats = await page.$$eval(
            'div.box-shadow-thin.arrow.grid-pool-overview > div > div, div.box-shadow-thin.arrow.grid-pool-overview > div > span',
            elements => {
              return elements.map(element =>
                element.textContent.replace(/\$/g, '').replace(/,/g, '').replace(/%/g, ''),
              );
            },
          );

          this.logger.log('Amount of elements: ', stats.length);
          const hasMissingData = stats.some(value => value === '-');
          if (!hasMissingData && stats.length === 4) {
            isLoaded = true;
            break;
          }
        }

        if (!isLoaded) {
          this.logger.error('The data haven not been loaded');
          return;
        }

        const tvlStr = stats[0];
        const aprStr = stats[1];
        // const volumeStr = stats[2];
        // const feesStr = stats[3];

        const poolData: PoolData = new PoolData();
        poolData.address = item.address;
        poolData.name = item.pair;
        poolData.decimals = 18;
        poolData.tvl = tvlStr;
        poolData.apr = aprStr;

        poolData.chain = ChainType.ZKSYNC;
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.SYNCSWAP}=========`);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      }
      return pools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.SYNCSWAP} pairs.`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug('Browser is close. ' + ExchangerType.SYNCSWAP);
      await browser.close();
    }
  }
}
