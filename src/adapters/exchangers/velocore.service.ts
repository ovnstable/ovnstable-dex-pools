import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PoolData } from './dto/pool.data.dto';
import { ExchangerRequestError } from '../../exceptions/exchanger.request.error';
import { ExchangerType } from '../../exchanger/models/inner/exchanger.type';
import { ChainType } from '../../exchanger/models/inner/chain.type';
import { getAgent } from '../../config/consts';

const poolsLineaArray = [
  {
    name: 'USDC/USD+/USDT+',
    poolAddress: '0x1d0188c4b276a09366d05d6be06af61a73bc7535',
    tokens: [
      '0xF0D8581eEb97637fDD42CA419a17617628898A70',
      '0x9582B6Ad01b308eDAc14CB9BDF21e7Da698b5EDD',
      '0xE0c6FDf4EFC676EB35EA094f2B01Af216F9C232c',
    ],
  },
];

const poolsZksyncArray = [
  {
    name: 'USD+/USDC',
    poolAddress: '0xf5E67261CB357eDb6C7719fEFAFaaB280cB5E2A6',
    tokens: ['0x8FbF6e10BdD8668adDcd2A30F5a76aA3dF89bECE', '0xfD9Ef3A008CC6068941Ca06e11D85dF39F4b9d8D'],
  },
];

const TIME_FOR_TRY = 20_000; // 5 sec.

@Injectable()
export class VelocoreService {
  private readonly logger = new Logger(VelocoreService.name);

  BASE_POOL_ZKSYNC_URL = 'https://zksync.velocore.xyz/liquidity';

  BASE_POOL_LINEA_URL = 'https://linea.velocore.xyz/liquidity';

  async getPoolsData(): Promise<PoolData[]> {
    const lineaPools = await this.getLineaPoolsData();
    const zkSyncPools = await this.getPoolsDataZkSync();
    return [...lineaPools, ...zkSyncPools];
  }

  async getLineaPoolsData(): Promise<PoolData[]> {
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.VELOCORE);

    try {
      // Create a new page
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      );

      // Set a default timeout of 60 seconds
      await page.setDefaultTimeout(60_000);

      const pools: PoolData[] = [];
      let itemCount = 0;

      for (let i = 0; i < poolsLineaArray.length; i++) {
        const pool = poolsLineaArray[i];
        const name = pool.name;
        const address = pool.poolAddress;
        const tokens = pool.tokens;
        let totalTvlValue = 0;
        const foundedPoolAprs = [];

        for (let j = 0; j < tokens.length; j++) {
          const tokenAddress = tokens[j];
          const url = `${this.BASE_POOL_LINEA_URL}/${tokenAddress}`;
          let tvlAfterLoop = 0;

          // let aprAfterLoop = 0;

          // Navigate to the SPA
          await page.goto(url);
          this.logger.log('GOTO: ', url);

          console.log(`Wait ${TIME_FOR_TRY / 1000} seconds`);
          await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

          // Wait for the desired content to load
          const elements = await page.$$('.mantine-fvq2zi');
          this.logger.log('Amount of elements: ', elements.length);

          this.logger.log('The token url data successfully loaded');

          // Extract the data from the page
          const data = await page.evaluate(() => {
            const markerListOfData = '.body-cell';

            // This function runs in the context of the browser page
            // You can use DOM manipulation and JavaScript to extract the data
            const elements = document.querySelectorAll(markerListOfData);

            const extractedData = [];

            console.log('Elements: ', elements);
            elements.forEach(element => {
              extractedData.push(element.textContent);
            });

            return extractedData;
          });

          // Display the extracted data
          console.log('Data inside the token: ', data);

          for (let i = 0; i < data.length; i++) {
            const element = data[i];
            const str: string = element;
            this.logger.log('String: ' + str);
            if (!str) {
              continue;
            }

            // Extracting TVL: TVL starts with "$".
            const tvlRegex = /\$ ([\d,.]+)/;
            const matchTvl = data[0].match(tvlRegex);
            let tvlValue;
            if (matchTvl && matchTvl[1]) {
              tvlValue = matchTvl[1];
              tvlAfterLoop = parseFloat(tvlValue);
            }

            // Extract APR value using regex
            const aprRegex = /([\d,.]+)%/;
            const matchApr = data[1].match(aprRegex);
            let aprValue;
            if (matchApr && matchApr[1]) {
              aprValue = parseFloat(matchApr[1]);
              foundedPoolAprs.push(aprValue);
              console.log('APR VALUE:', aprValue);
              /*if (aprValue > 0) {
                                  aprAfterLoop = aprValue;
                              }*/
            }
          }

          totalTvlValue += tvlAfterLoop;

          // totalAprValue = aprAfterLoop;
        }

        let mostApr = foundedPoolAprs[0];

        for (let k = 0; k < foundedPoolAprs.length; k++) {
          if (!mostApr) {
            mostApr = foundedPoolAprs[k];
            continue;
          }
          if (foundedPoolAprs[k] !== 0 && foundedPoolAprs[k] > mostApr) {
            mostApr = foundedPoolAprs[k];
          }
        }

        console.log('Total APR:', mostApr);

        if (!address) {
          this.logger.error(`Pool address not found in map. name: ${name} exType: ${ExchangerType.VELOCORE}`);
          continue;
        }

        const poolData: PoolData = new PoolData();
        poolData.address = address;
        poolData.name = name;
        poolData.decimals = null;
        poolData.tvl = totalTvlValue ? totalTvlValue.toString() : null;
        poolData.apr = mostApr ? mostApr.toString() : null;
        poolData.chain = ChainType.LINEA;
        poolData.pool_version = 'v2';
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.VELOCORE}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      }
      return pools;
    } catch (e) {
      const errorMessage = `Error occurred while loading ${ExchangerType.VELOCORE} pairs.`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug(`Browser is closed. ${ExchangerType.VELOCORE}`);
      await browser.close();
    }
  }

  async getPoolsDataZkSync(): Promise<PoolData[]> {
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      executablePath: getAgent(process.env.IS_MAC),
      args: ['--no-sandbox'],
    });

    this.logger.debug('Browser is start. ' + ExchangerType.VELOCORE);

    try {
      // Create a new page
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      );

      // Set a default timeout of 60 seconds
      await page.setDefaultTimeout(60_000);

      const pools: PoolData[] = [];
      let itemCount = 0;

      for (let i = 0; i < poolsZksyncArray.length; i++) {
        const pool = poolsZksyncArray[i];
        const name = pool.name;
        const address = pool.poolAddress;
        const tokens = pool.tokens;
        let totalTvlValue = 0;
        const foundedPoolAprs = [];

        for (let j = 0; j < tokens.length; j++) {
          const tokenAddress = tokens[j];
          const url = `${this.BASE_POOL_ZKSYNC_URL}/${tokenAddress}`;
          let tvlAfterLoop = 0;

          // let aprAfterLoop = 0;

          // Navigate to the SPA
          await page.goto(url);
          this.logger.log('GOTO: ', url);

          console.log(`Wait ${TIME_FOR_TRY / 1000} seconds`);
          await new Promise(resolve => setTimeout(resolve, TIME_FOR_TRY));

          // Wait for the desired content to load
          const elements = await page.$$('.css-tczy7u');
          this.logger.log('Amount of elements: ', elements.length);

          this.logger.log('The token url data successfully loaded');

          // Extract the data from the page
          const data = await page.evaluate(() => {
            const markerListOfData = '.body-cell';

            // This function runs in the context of the browser page
            // You can use DOM manipulation and JavaScript to extract the data
            const elements = document.querySelectorAll(markerListOfData);

            const extractedData = [];

            console.log('Elements: ', elements);
            elements.forEach(element => {
              extractedData.push(element.textContent);
            });

            return extractedData;
          });

          // Display the extracted data
          console.log('Data inside the token: ', data);

          for (let i = 0; i < data.length; i++) {
            const element = data[i];
            const str: string = element;
            this.logger.log('String: ' + str);
            if (!str) {
              continue;
            }

            // Extracting TVL: TVL starts with "$".
            const tvlRegex = /\$ ([\d,.]+)/;
            const matchTvl = data[0].match(tvlRegex);
            let tvlValue;
            if (matchTvl && matchTvl[1]) {
              tvlValue = matchTvl[1];
              tvlAfterLoop = parseFloat(tvlValue);
            }

            // Extract APR value using regex
            const aprRegex = /([\d,.]+)%/;
            const matchApr = data[1].match(aprRegex);
            let aprValue;
            if (matchApr && matchApr[1]) {
              aprValue = parseFloat(matchApr[1]);
              foundedPoolAprs.push(aprValue);
              console.log('APR VALUE:', aprValue);
              /*if (aprValue > 0) {
                                  aprAfterLoop = aprValue;
                              }*/
            }
          }

          totalTvlValue += tvlAfterLoop;

          // totalAprValue = aprAfterLoop;
        }

        let mostApr = foundedPoolAprs[0];

        for (let k = 0; k < foundedPoolAprs.length; k++) {
          if (!mostApr) {
            mostApr = foundedPoolAprs[k];
            continue;
          }
          if (foundedPoolAprs[k] !== 0 && foundedPoolAprs[k] > mostApr) {
            mostApr = foundedPoolAprs[k];
          }
        }

        console.log('Total APR:', mostApr);

        if (!address) {
          this.logger.error(`Pool address not found in map. name: ${name} exType: ${ExchangerType.VELOCORE}`);
          continue;
        }

        const poolData: PoolData = new PoolData();
        poolData.address = address;
        poolData.name = name;
        poolData.decimals = null;
        poolData.tvl = totalTvlValue ? totalTvlValue.toString() : null;
        poolData.apr = mostApr ? mostApr.toString() : null;
        poolData.chain = ChainType.ZKSYNC;
        poolData.pool_version = 'v2';
        pools.push(poolData);
        this.logger.log(`=========${ExchangerType.VELOCORE}=========`);
        itemCount++;
        this.logger.log('Found ovn pool #: ', itemCount);
        this.logger.log('Found ovn pool: ', poolData);
        this.logger.log('==================');
      }
      return pools;
    } catch (e) {
      const errorMessage = `Error occurred while loading ${ExchangerType.VELOCORE} pairs.`;
      this.logger.error(errorMessage, e);
      throw new ExchangerRequestError(errorMessage);
    } finally {
      this.logger.debug(`Browser is closed. ${ExchangerType.VELOCORE}`);
      await browser.close();
    }
  }
}
