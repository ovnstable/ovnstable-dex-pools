import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { getAgent } from '../../config/consts';

const POOLS_MAP = {
  // pool name: pool address
  'sAMM-FRAX/USD+': '0xD330841EF9527E3Bd0abc28a230C7cA8dec9423B',
  'sAMM-USD+/DAI+': '0x667002F9DC61ebcBA8Ee1Cbeb2ad04060388f223',
  'sAMM-USDC/USD+': '0x46e1B51e07851301f025ffeA506b140dB80a214A',
};

@Injectable()
export class VelodromeService {
  private readonly logger = new Logger(VelodromeService.name);

  BASE_API_URL = 'https://velodrome.finance/liquidity';
  METHOD_GET_PAIRS = '?query=usd%2B&filter=all';
  async getPoolsData(): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${this.METHOD_GET_PAIRS}`;

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
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      );
      // Set a default timeout of 20 seconds
      await page.setDefaultTimeout(60000);

      // Navigate to the SPA
      await page.goto(url);
      const markerOfLoadingIsFinish = '.justify-between.bg-white.p-4.text-sm.text-gray-600';

      // Wait for the desired content to load
      await page.waitForSelector(markerOfLoadingIsFinish);

      // Extract the data from the page
      const data = await page.evaluate(() => {
        const markerListOfData = '.border-neutral-200';

        // This function runs in the context of the browser page
        // You can use DOM manipulation and JavaScript to extract the data
        const elementsData = document.querySelectorAll(markerListOfData);
        const elements = elementsData[0].textContent.split('Deposit');
        const extractedData = [];

        elements.forEach(element => {
          extractedData.push(element);
        });

        return extractedData;
      });

      // Display the extracted data
      const pools: PoolData[] = [];
      let itemCount = 0;

      console.log(data);
      for (let i = 0; i < data.length; i++) {
        const element = data[i];
        const str: string = element;
        this.logger.log('String: from browser', str);
        if (!str) {
          continue;
        }

        // Extracting name: The name is at the beginning of the string and ends just before first –.
        this.logger.log('Start search NAME');
        const nameRegex =
          /(sAMM-.+?Basic Stable|sAMMV2-.+?Basic Stable|vAMM-.+?Basic Volatile|vAMMV2-.+?Basic Volatile)/;
        console.log(str, str.match(nameRegex));
        const name = str.match(nameRegex)[0].replace('Basic Stable', '').replace('Basic Volatile', '').replace(' ', '');
        this.logger.log('Name: ' + name);
        const address = POOLS_MAP[name];
        if (!address) {
          this.logger.error(`Pool address not found in map. name: ${name} exType: ${ExchangerType.VELODROME}`);
          continue;
        }

        this.logger.log('Start search TVL');
        // Extracting TVL: TVL starts with "$" and ends just before "Total".
        const tvlRegex = /TVL\s*~\$(.*?)APR/;
        const tvlData = str.match(tvlRegex)[1];
        const tvl = parseFloat(tvlData.replace(/,/g, ''));
        this.logger.log('tvl: ' + name);

        // Extracting APR: APR is after "APR" and ends just before "%".
        const aprRegex = /APR([\d\.]+)/;
        console.log('Start search APR');
        const aprStr = str.replace(/,/g, '');
        const aprData = aprStr.match(aprRegex)[1];
        const apr = parseFloat(aprData.replace('%', ''));
        this.logger.log('apr: ' + name);

        const poolData: PoolData = new PoolData();
        poolData.address = address;
        poolData.name = name;
        poolData.decimals = null;
        poolData.tvl = tvl.toString();
        poolData.apr = apr.toString();
        poolData.chain = ChainType.OPTIMISM;
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

    return [];
  }
}
