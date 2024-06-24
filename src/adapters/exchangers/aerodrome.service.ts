import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import puppeteer from 'puppeteer';
import { getAgent } from '../../config/consts';
import BigNumber from 'bignumber.js';
import { TelegramService } from 'src/telegram/telegram.service';

type mapEntity = {
  [key: string]: {
    address: string;
    pool_version: string;
  };
};

const USD_PLUS_MAP = {
  // pool name: pool address
  'sAMM-DAI+/USD+': { address: '0x1b05e4e814b3431a48b8164c41eac834d9ce2da6', pool_version: 'v2' },
  'sAMM-USD+/USDbC': { address: '0x4a3636608d7bc5776cb19eb72caa36ebb9ea683b', pool_version: 'v2' },
  'sAMM-USDC/USD+': { address: '0x418457Ca08fA5EC77f811B105F2c585cd051Ac10', pool_version: 'v2' },
  'sAMM-USDC+/USD+': { address: '0xe96c788e66a97cf455f46c5b27786191fd3bc50b', pool_version: 'v2' },
  'vAMM-DAI+/USD+': { address: '0x3CF04A380e54FA4eD31eA48acb9132EA35e2E8D9', pool_version: 'v2' },
  'vAMM-WETH/USD+': { address: '0x08B935148AB10d3699Cb8d944519e8213abE6f1D', pool_version: 'v2' },
  'sAMM-DOLA/USD+': { address: '0x952388d73EA3E940eD6824DBd75ed6aD58e6B436', pool_version: 'v2' },
  'vAMM-AERO/USD+': { address: '0x267d950110D9ED57999c3451b89C35a9D278C074', pool_version: 'v2' },
  'vAMM-USD+/sFRAX': { address: '0xbB38EeBd670A9F3cafe6D3170862ccD930cB25f9', pool_version: 'v2' },
  'sAMM-USD+/eUSD': { address: '0x8041e2A135D2da7A8E21E4B14113D8245EC532e1', pool_version: 'v2' },
  'vAMM-USD+/wstETH': { address: '0xf15B30a0a823f588B523fD794A43939F0B1dC582', pool_version: 'v2' },
  'CL1-DOLA/USD+': { address: '0x96331Fcb46A7757854d9E26AFf3aCA2815D623fD', pool_version: 'v3' },
  'CL100-WETH/USD+': { address: '0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606', pool_version: 'v3' },
  'CL1-USDC/USD+': { address: '0x0c1A09d5D0445047DA3Ab4994262b22404288A3B', pool_version: 'v3' },
  'CL1-USD+/USDbC': { address: '0x20086910E220D5f4c9695B784d304A72a0de403B', pool_version: 'v3' },
  'CL1-USDz/USD+': { address: '0x4Ef1E503C4F1e5664ac98294d0e42ddC9c0FF961', pool_version: 'v3' },
  'CL50-USD+/sFRAX': { address: '0x8e62bE92c6Fb091428d0d6cBa0C0e32529B27e51', pool_version: 'v3' },
  'CL50-USD+/eUSD': { address: '0x9EfdF5b3E05e52c2957BDA3e89Ea35C5296A78f0', pool_version: 'v3' },
  'CL200-USD+/wstETH': { address: '0xa01A2513E95263b9BaCe60B573ce874E1e7a5246', pool_version: 'v3' },
  'CL200-DEGEN/USD+': { address: '0xa19acc3B4f11c46c2b1Fc36B5f592AF422Ee338c', pool_version: 'v3' },
};

const OVN_MAP = {
  'vAMM-OVN/USD+': { address: '0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197', pool_version: 'v2' },
  'vAMM-AERO/OVN': { address: '0x4704f9Cf735b58ea442E387ACca6717311597322', pool_version: 'v2' },
};

@Injectable()
export class AerodromeService {
  private readonly logger = new Logger(AerodromeService.name);

  BASE_API_URL = 'https://aerodrome.finance/liquidity';

  async getPoolsData(): Promise<PoolData[]> {
    const usdPlusPools = await this.getPools('?query=usd%2B&filter=all', USD_PLUS_MAP);
    const ovnPools = await this.getPools('?query=ovn&filter=all', OVN_MAP);

    return [...usdPlusPools, ...ovnPools];
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

    this.logger.debug('Browser is start. ' + ExchangerType.AERODROME);

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
      const markerOfLoadingIsFinish = '.justify-between.bg-white.p-5.text-sm.text-gray-600';

      // Wait for the desired content to load
      await page.waitForSelector(markerOfLoadingIsFinish);
      const data = await page.$$eval('.space-y-1\\.5.shadow-sm.rounded-lg > div', elements => {
        return elements.map(el => {
          const nameElement = el.querySelector('div:nth-child(1) strong');
          const aprElement = el.querySelector('div:nth-child(1) span.tracking-wider');
          const tvlElement = el.querySelector('div:nth-child(1) > a > div:nth-child(2)');

          const name = nameElement ? nameElement.textContent : '';
          const aprStr = aprElement ? aprElement.textContent : '0';
          const tvlStr = tvlElement ? tvlElement.textContent : '0';

          return {
            name,
            tvl: tvlStr ? tvlStr.replace('TVL  ~$', '').replace(/,/g, '') : null,
            apr: aprStr ? aprStr.replace('%', '').replace(/,/g, '') : null,
          };
        });
      });

      const pools: PoolData[] = [];

      for (const [key, value] of Object.entries(poolsMap)) {
        const item = data.find(el => el.name === key);
        if (!item) {
          this.logger.error(`Item ${key} not found in list`, '');
          continue;
        }

        const poolData: PoolData = new PoolData();
        poolData.address = value.address;
        poolData.name = key;
        poolData.decimals = null;
        poolData.tvl = BigNumber(item.tvl).toFixed(2);
        poolData.apr = BigNumber(item.apr).toFixed(2);
        poolData.chain = ChainType.BASE;
        poolData.pool_version = value.pool_version;
        pools.push(poolData);
      }

      return pools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.AERODROME} pairs. url: ${url}`;
      this.logger.error(errorMessage);
    } finally {
      this.logger.debug('Browser is close. ' + ExchangerType.AERODROME);
      await browser.close();
    }
  }
}
