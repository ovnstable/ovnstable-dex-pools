import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import BigNumber from 'bignumber.js';
import puppeteer from 'puppeteer';
import { getAgent } from '../../config/consts';

const TIME_FOR_TRY = 5000; // 5 sec

const ZK_POOLS = {
  '0x6a8fc7e8186ddc572e149dfaa49cfae1e571108b': { ui: 'USD+-USDC.e', graph: 'USDC.e/USD+' },
};
const ARB_POOLS = {
  '0x8a06339abd7499af755df585738ebf43d5d62b94': { ui: 'USDT+-USD+', graph: 'USDT+/USD+' },
  '0xa1f9159e11ad48524c16c9bf10bf440815b03e6c': { ui: 'USD+-USDC', graph: 'USDC/USD+' },
  '0xf92768916015b5ebd9fa54d6ba10da5864e24914': { ui: 'USD+-ARB', graph: 'ARB/USD+' },
  '0xe37304f7489ed253b2a46a1d9dabdca3d311d22e': { ui: 'USD+-ETH', graph: 'WETH/USD+' },
};

const BASE_POOLS = {
  '0x5b9feb72588d2800892a00d2abb4ca9071df846e': { ui: 'USD+-ETH', graph: 'WETH/USD+' },
  '0xa4846201e94d2a5399774926f760a36d52ac22bf': { ui: 'USD+-wstETH', graph: 'USD+/wstETH' },
  '0xcC7BfD85395042EE0cACe335E40b549b3d08Eb78': { ui: 'OVN-ETH', graph: 'WETH/OVN' }, // New OVN pool added
};

@Injectable()
export class PancakeService {
  private readonly logger = new Logger(PancakeService.name);
  private readonly BASE_URL = 'https://explorer-api.pancakeswap.com/cached/pools/v3';

  async getPools(chain: ChainType): Promise<PoolData[]> {
    let poolsObj;
    let chainPath;
    let chainPostfix;

    switch (chain) {
      case ChainType.ARBITRUM:
        poolsObj = ARB_POOLS;
        chainPath = 'arbitrum';
        chainPostfix = 'arb';
        break;
      case ChainType.ZKSYNC:
        poolsObj = ZK_POOLS;
        chainPath = 'zksync';
        chainPostfix = 'zksync';
        break;
      case ChainType.BASE:
        poolsObj = BASE_POOLS;
        chainPath = 'base';
        chainPostfix = 'base';
        break;
      default:
        throw new Error(`Unsupported chain type: ${chain}`);
    }

    const poolAddresses = Object.keys(poolsObj);

    try {
      const pools = await Promise.all(
        poolAddresses.map(async address => {
          const url = `${this.BASE_URL}/${chainPath}/${address}`;
          const response = await fetch(url);
          const data = await response.json();

          const poolData = new PoolData();
          poolData.address = data.id;
          poolData.name = `${data.token0.symbol}/${data.token1.symbol}`;
          poolData.decimals = 18;
          poolData.tvl = new BigNumber(data.tvlUSD).toFixed(2);
          poolData.apr = '0';
          poolData.chain = chain;
          poolData.pool_version = 'v3';

          return poolData;
        }),
      );

      const newPools = await this.initAprs(pools, chainPostfix, poolsObj);

      if (newPools.some(pool => BigNumber(pool.apr).eq(0))) {
        throw new Error(`Some Pancake pool APR === 0, ${newPools} data`);
      }

      return newPools;
    } catch (e) {
      const errorMessage = `Error when loading ${ExchangerType.PANCAKE} pairs.`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    }
  }

  async getPoolsData(): Promise<PoolData[]> {
    const arbPools = await this.getPools(ChainType.ARBITRUM);
    const zkPools = await this.getPools(ChainType.ZKSYNC);
    const basePools = await this.getPools(ChainType.BASE);
    return [...arbPools, ...zkPools, ...basePools];
  }

  private async initAprs(
    pools: PoolData[],
    chainPostfix: string,
    poolsObj: { [s: string]: { ui: string; graph: string } },
  ): Promise<PoolData[]> {
    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser started. ' + ExchangerType.PANCAKE);

    try {
      const url = `https://pancakeswap.finance/farms?chain=${chainPostfix}`;
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1600 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      );
      await page.setDefaultTimeout(100000);

      await page.goto(url);
      const markerOfLoadingIsFinish = '#table-container';
      await page.waitForSelector(markerOfLoadingIsFinish);
      await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));
      await page.waitForSelector('input[placeholder="Search Farms"]');

      // First search with "+"
      await page.type('input[placeholder="Search Farms"]', '+');
      await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

      const dataPlus = await page.evaluate(() => {
        const elements = document.querySelectorAll('#table-container tr');
        return Array.from(elements).map(element => element.textContent);
      });

      // Clear the input field
      await page.evaluate(() => {
        const inputElement = document.querySelector('input[placeholder="Search Farms"]') as HTMLInputElement;
        inputElement.value = '';
      });

      // Second search with "OVN"
      await page.type('input[placeholder="Search Farms"]', 'OVN');
      await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

      const dataOvn = await page.evaluate(() => {
        const elements = document.querySelectorAll('#table-container tr');
        return Array.from(elements).map(element => element.textContent);
      });

      const data = [...dataPlus, ...dataOvn]; // Combine the results from both searches

      const poolsArr = Object.values(poolsObj);

      const filteredArray = data.filter(item => poolsArr.some(value => item.includes(value.ui)));

      filteredArray.forEach(poolStr => {
        const pair = poolStr.split(' LP')[0];
        const tmp = poolsArr.find(pool => pool.ui === pair);
        const aprMatch = poolStr.match(/APR(?:Up to)?([\d,.]+)%(?:([\d,.]+)%)?/);
        const apr = aprMatch ? aprMatch[2] || aprMatch[1] : null;

        pools.forEach(pool => {
          if (pool.name === tmp.graph && pool.apr < apr) {
            pool.apr = new BigNumber(apr.replace(',', '')).toFixed(2);
          }
        });
      });

      return pools;
    } catch (e) {
      const errorMessage = `Error when loading ${ExchangerType.PANCAKE} pairs.`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug('Browser closed. ' + ExchangerType.PANCAKE);
      await browser.close();
    }
  }
}
