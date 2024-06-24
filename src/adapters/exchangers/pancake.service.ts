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
  '0x6a8fc7e8186ddc572e149dfaa49cfae1e571108b': { ui: 'USD+-USDC.e', graph: 'USDC/USD+' },
};
const ARB_POOLS = {
  '0x8a06339abd7499af755df585738ebf43d5d62b94': { ui: 'USDT+-USD+', graph: 'USDT+/USD+' },
  '0x714d48cb99b87f274b33a89fbb16ead191b40b6c': { ui: 'OVN-USD+', graph: 'OVN/USD+' },
  '0xa1f9159e11ad48524c16c9bf10bf440815b03e6c': { ui: 'USD+-USDC', graph: 'USDC/USD+' },
  '0xf92768916015b5ebd9fa54d6ba10da5864e24914': { ui: 'USD+-ARB', graph: 'ARB/USD+' },
  '0xe37304f7489ed253b2a46a1d9dabdca3d311d22e': { ui: 'USD+-ETH', graph: 'WETH/USD+' },
};

const BASE_POOLS = {
  '0x5b9feb72588d2800892a00d2abb4ca9071df846e': { ui: 'USD+-ETH', graph: 'WETH/USD+' },
  '0xa4846201e94d2a5399774926f760a36d52ac22bf': { ui: 'USD+-wstETH', graph: 'USD+/wstETH' },
  '0x40c91ebd1fa940a363989ac80a31b3a988dd649b': { ui: 'USD+-cbETH', graph: 'cbETH/USD+' },
  '0x98ee8cd99370ab19f18fb9033337995076867ee9': { ui: 'BRETT-USD+', graph: 'BRETT/USD+' },
  '0xdd5ac923f03a97ff9f0cfbfa0f5e155e46c3727d': { ui: 'DEGEN-USD+', graph: 'DEGEN/USD+' },
};

const buildQuery = (pools: { [key: string]: any }) => {
  const formattedPools = JSON.stringify(Object.keys(pools));
  return `
    query pools {
      pools(where: { id_in: ${formattedPools} }, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id
        feeTier
        liquidity
        sqrtPrice
        tick
        token0 { id symbol name decimals derivedETH }
        token1 { id symbol name decimals derivedETH }
        token0Price
        token1Price
        totalValueLockedToken0
        totalValueLockedToken1
        totalValueLockedUSD
        protocolFeesUSD
      }
    }
  `;
};

@Injectable()
export class PancakeService {
  private readonly logger = new Logger(PancakeService.name);
  private readonly BASE_GRAPHQL_ARB = 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-arb';
  private readonly BASE_GRAPHQL_ZK = 'https://api.studio.thegraph.com/query/45376/exchange-v3-zksync/version/latest';
  private readonly BASE_GRAPHQL_BASE = 'https://api.studio.thegraph.com/query/45376/exchange-v3-base/version/latest';
  private readonly BASE_URL_ARB = 'https://pancakeswap.finance/farms?chain=arb';
  private readonly BASE_URL_ZK = 'https://pancakeswap.finance/farms?chain=zkSync';
  private readonly BASE_URL_BASE = 'https://pancakeswap.finance/farms?chain=base';

  async getPools(chain: ChainType): Promise<PoolData[]> {
    let poolsObj;
    let url;

    switch (chain) {
      case ChainType.ARBITRUM:
        poolsObj = ARB_POOLS;
        url = this.BASE_GRAPHQL_ARB;
        break;
      case ChainType.ZKSYNC:
        poolsObj = ZK_POOLS;
        url = this.BASE_GRAPHQL_ZK;
        break;
      case ChainType.BASE:
        poolsObj = BASE_POOLS;
        url = this.BASE_GRAPHQL_BASE;
        break;
      default:
        throw new Error(`Unsupported chain type: ${chain}`);
    }

    const queryFirstPool = buildQuery(poolsObj);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          operationName: 'pools',
          query: queryFirstPool,
          variables: {},
        }),
      });

      const data = await response.json();
      const apiPoolsData = data.data.pools;

      const pools = apiPoolsData.map(item => {
        const poolData = new PoolData();
        poolData.address = item.id;
        poolData.name = `${item.token0.symbol}/${item.token1.symbol}`;
        poolData.decimals = 18;
        poolData.tvl = new BigNumber(item.totalValueLockedUSD).toFixed(2);
        poolData.apr = '0';
        poolData.chain = chain;
        poolData.pool_version = 'v3';

        this.logger.log(`=========${ExchangerType.PANCAKE}=========`);
        this.logger.log('Found pool: ', poolData);
        this.logger.log('==================');

        return poolData;
      });

      const newPools = await this.initAprs(pools, chain);

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
    const [arbPools, zkPools, basePools] = await Promise.all([
      this.getPools(ChainType.ARBITRUM),
      this.getPools(ChainType.ZKSYNC),
      this.getPools(ChainType.BASE),
    ]);
    return [...arbPools, ...zkPools, ...basePools];
  }

  private async initAprs(pools: PoolData[], chain: ChainType): Promise<PoolData[]> {
    let url;
    let poolsArr;

    switch (chain) {
      case ChainType.ARBITRUM:
        url = this.BASE_URL_ARB;
        poolsArr = Object.values(ARB_POOLS);
        break;
      case ChainType.ZKSYNC:
        url = this.BASE_URL_ZK;
        poolsArr = Object.values(ZK_POOLS);
        break;
      case ChainType.BASE:
        url = this.BASE_URL_BASE;
        poolsArr = Object.values(BASE_POOLS);
        break;
      default:
        throw new Error(`Unsupported chain type: ${chain}`);
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser started. ' + ExchangerType.PANCAKE);

    try {
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
      await page.type('input[placeholder="Search Farms"]', '+');
      await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

      const data = await page.evaluate(() => {
        const elements = document.querySelectorAll('#table-container tr');
        return Array.from(elements).map(element => element.textContent);
      });

      const filteredArray = data.filter(item => poolsArr.some(value => item.includes(value.ui)));

      filteredArray.forEach(poolStr => {
        const pair = poolStr.split(' LP')[0];
        const tmp = poolsArr.find(pool => pool.ui == pair);
        const aprMatch = poolStr.match(/APR(?:Up to)?([\d,.]+)%/);
        const apr = aprMatch ? aprMatch[1] : null;

        pools.forEach(pool => {
          if (pool.name === tmp.graph && pool.apr < apr) {
            pool.apr = new BigNumber(apr.replace(',', '')).toFixed(2);
          }
        });
      });

      return pools;
    } catch (e) {
      const errorMessage = `Error when loading ${ExchangerType.PANCAKE} pairs. URL: ${url}`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug('Browser closed. ' + ExchangerType.PANCAKE);
      await browser.close();
    }
  }
}
``;
