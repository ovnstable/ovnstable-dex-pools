import { Injectable, Logger } from '@nestjs/common';
import { PoolData } from './dto/pool.data.dto';
import fetch from 'node-fetch';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import BigNumber from 'bignumber.js';
import puppeteer from 'puppeteer';
import { getAgent } from '../../config/consts';

const TIME_FOR_TRY = 5_000; // 5 sec.

// lowerCase important
const ZK_POOLS = {
  '0x6a8fc7e8186ddc572e149dfaa49cfae1e571108b': 'USD+-USDC',
};
const ARB_POOLS = {
  '0x8a06339abd7499af755df585738ebf43d5d62b94': 'USDT+-USD+',
  '0x714d48cb99b87f274b33a89fbb16ead191b40b6c': 'OVN-USD+',
  '0xa1F9159e11aD48524c16C9bf10bf440815b03e6C': 'USD+-USDC',
  '0xf92768916015b5ebd9fa54d6ba10da5864e24914': 'USD+-ARB',
  '0xe37304f7489ed253b2a46a1d9dabdca3d311d22e': 'USD+-ETH',
};

const buildQuery = (pools: { [key: string]: string }) => {
  const formattedPools = JSON.stringify(Object.keys(pools));
  console.log(formattedPools);
  return `
        query pools {
        pools(where: { id_in: ${formattedPools} },
                orderBy: totalValueLockedUSD, orderDirection: desc) {
            id
            feeTier
            liquidity
            sqrtPrice
            tick
            token0 {
            id
            symbol
            name
            decimals
            derivedETH
            }
            token1 {
            id
            symbol
            name
            decimals
            derivedETH
            }
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

  // get all api info / api data
  BASE_GRAPHQL_ARB = 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-arb';
  BASE_GRAPHQL_ZK = 'https://api.studio.thegraph.com/query/45376/exchange-v3-zksync/version/latest';
  BASE_URL_ARB = 'https://pancakeswap.finance/farms?chain=arb';
  BASE_URL_ZK = 'https://pancakeswap.finance/farms?chain=zkSync';

  async getPools(chain: ChainType): Promise<PoolData[]> {
    const poolsObj = chain === ChainType.ARBITRUM ? ARB_POOLS : ZK_POOLS;
    const url = chain === ChainType.ARBITRUM ? this.BASE_GRAPHQL_ARB : this.BASE_GRAPHQL_ZK;
    const queryFirstPool = buildQuery(poolsObj);

    const response = fetch(url, {
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
    })
      .then(async (data): Promise<PoolData[]> => {
        const pools: PoolData[] = [];
        const [responseBody] = await Promise.all([data.json()]);
        const apiPoolsData = responseBody.data.pools;

        apiPoolsData.forEach(item => {
          const poolData: PoolData = new PoolData();
          poolData.address = item.id;
          poolData.name = poolsObj[item.id.toLowerCase()].replace('-', '/');
          poolData.decimals = 18;
          poolData.tvl = new BigNumber(item.totalValueLockedUSD).toFixed(2);

          poolData.apr = '0';
          poolData.chain = chain;
          poolData.pool_version = 'v3';
          pools.push(poolData);
          this.logger.log(`=========${ExchangerType.PANCAKE}=========`);
          this.logger.log('Found ovn pool: ', poolData);
          this.logger.log('==================');
        });

        try {
          const newPools = await this.initAprs(pools, chain);

          if (newPools.some(_ => BigNumber(_.apr).eq(0))) {
            throw Error(`Some Pancake pool apr === 0, ${newPools} data`);
          }

          return newPools;
        } catch (e) {
          this.logger.error(e);
        }
      })
      .catch(e => {
        const errorMessage = `Error when load ${ExchangerType.PANCAKE} pairs.`;
        this.logger.error(errorMessage, e);
        throw new ExchangerRequestError(errorMessage);
      });

    return await response;
  }

  async getPoolsData(): Promise<PoolData[]> {
    const arbPools = await this.getPools(ChainType.ARBITRUM);
    const zkPools = await this.getPools(ChainType.ZKSYNC);
    return [...arbPools, ...zkPools];
  }

  private async initAprs(ovnPools: PoolData[], chain: ChainType): Promise<PoolData[]> {
    const url = chain === ChainType.ARBITRUM ? this.BASE_URL_ARB : this.BASE_URL_ZK;

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.PANCAKE);

    try {
      // Create a new page
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1600 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      );
      // Set a default timeout of 20 seconds
      await page.setDefaultTimeout(100000);

      // Navigate to the SPA
      await page.goto(url);
      const markerOfLoadingIsFinish = '#table-container';

      // Wait for the desired content to load
      await page.waitForSelector(markerOfLoadingIsFinish);
      await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));
      // Extract the data from the page
      const data = await page.evaluate(() => {
        const markerListOfData = '#table-container tr';

        // This function runs in the context of the browser page
        // You can use DOM manipulation and JavaScript to extract the data
        const elements = document.querySelectorAll(markerListOfData);
        const extractedData = [];

        elements.forEach(element => {
          extractedData.push(element.textContent);
        });

        return extractedData;
      });

      const poolsArr = chain === ChainType.ARBITRUM ? Object.values(ARB_POOLS) : Object.values(ZK_POOLS);
      const filteredArray = data.filter(item => {
        return poolsArr.some(value => item.includes(value));
      });

      filteredArray.forEach(poolStr => {
        let pair = poolStr.split(' LP')[0].replace('-', '/');
        pair = pair === 'USD+/USDC.e' ? 'USD+/USDC' : pair; // gql returns USDC/USD+ and fronted returns USD+/USDC

        const aprMatch = poolStr.match(/APR([\d,.]+)%/);
        const apr = aprMatch ? aprMatch[1] : null;

        ovnPools.forEach(pool => {
          if (pool.name === pair && pool.apr < apr) {
            pool.apr = new BigNumber(apr.replace(',', '')).toFixed(2);
          }
        });
      });

      return ovnPools;
    } catch (e) {
      const errorMessage = `Error when load ${ExchangerType.PANCAKE} pairs. url: ${url}`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug('Browser is close. ' + ExchangerType.PANCAKE);
      await browser.close();
    }
  }

  private getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
  }
}
