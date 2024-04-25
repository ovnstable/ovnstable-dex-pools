import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import puppeteer from 'puppeteer';
import { getAgent } from '../../config/consts';

const POOLS_MAP = {
  // pool name: pool address
  'sAMM-DAI+/USD+': '0x1b05e4e814b3431a48b8164c41eac834d9ce2da6',
  'sAMM-USD+/USDbC': '0x4a3636608d7bc5776cb19eb72caa36ebb9ea683b',
  'sAMM-USDC/USD+': '0x418457Ca08fA5EC77f811B105F2c585cd051Ac10',
  'sAMM-USDC+/USD+': '0xe96c788e66a97cf455f46c5b27786191fd3bc50b',
  'vAMM-DAI+/USD+': '0x3CF04A380e54FA4eD31eA48acb9132EA35e2E8D9',
  'vAMM-OVN/USD+': '0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197',
  'vAMM-WETH/USD+': '0x08B935148AB10d3699Cb8d944519e8213abE6f1D',
  'sAMM-DOLA/USD+': '0x952388d73EA3E940eD6824DBd75ed6aD58e6B436',
  'vAMM-AERO/USD+': '0x267d950110D9ED57999c3451b89C35a9D278C074',
  'vAMM-USD+/sFRAX': '0xbB38EeBd670A9F3cafe6D3170862ccD930cB25f9',
  'vAMM-AERO/OVN': '0x4704f9Cf735b58ea442E387ACca6717311597322',
  'sAMM-USD+/eUSD': '0x8041e2A135D2da7A8E21E4B14113D8245EC532e1',
  'vAMM-USD+/wstETH': '0xf15B30a0a823f588B523fD794A43939F0B1dC582',
};

@Injectable()
export class AerodromeService {
  private readonly logger = new Logger(AerodromeService.name);

  BASE_API_URL = 'https://aerodrome.finance/liquidity';

  async getPoolsData(): Promise<PoolData[]> {
    const usdPlusPools = await this.getPools('?query=usd%2B&filter=all');
    const ovnPools = await this.getPools('?query=ovn&filter=all');

    return [...usdPlusPools, ...ovnPools];
  }

  async getPools(queryString: string): Promise<PoolData[]> {
    const url = `${this.BASE_API_URL}/${queryString}`;

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.AERODROME);

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

      for (let i = 0; i < data.length; i++) {
        const element = data[i];
        const str: string = element;
        this.logger.log('String: from browser', str);
        if (!str) {
          continue;
        }

        // Extracting name: The name is at the beginning of the string and ends just before first –.
        this.logger.log('Start search NAME');
        const nameRegex = /(sAMM-.+?Basic Stable|vAMM-.+?Basic Volatile)/;
        const name = str.match(nameRegex)[0].replace('Basic Stable', '').replace('Basic Volatile', '').replace(' ', '');
        this.logger.log('Name: ' + name);
        const address = POOLS_MAP[name];
        if (!address) {
          this.logger.error(`Pool address not found in map. name: ${name} exType: ${ExchangerType.AERODROME}`);
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
        poolData.chain = ChainType.BASE;
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.AERODROME}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      }

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
